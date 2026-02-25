use anyhow::{Context, Result};
// use std::path::BufReader;
use std::path::PathBuf;
use std::time::Duration;

use indoc::formatdoc;
use serde::Serialize;
use tauri::async_runtime::{Mutex, Receiver};
use tauri::{Emitter, Manager, State};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tempfile::TempDir;

use crate::AppData;

#[derive(Clone, Serialize)]
struct FlashEvent<T> {
    port: String,
    data: T,
}

const FIRMWARE: &[u8] = include_bytes!("../firmware.txt");
const PASSWORD: &[u8] = include_bytes!("../password.txt");
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(20);
const MAX_CONSECUTIVE_ACK_ERRORS: i32 = 5;

struct FlashConfig {
    _temp_dir: TempDir,
    script_path: PathBuf,
}

impl FlashConfig {
    fn create(port: &str) -> Result<Self> {
        let temp_dir = TempDir::new().context("Failed to create temporary directory")?;
        let base_path = temp_dir.path();

        let firmware_path = base_path.join("firmware.txt");
        std::fs::write(&firmware_path, FIRMWARE).context("Failed to write firmware file")?;

        let password_path = base_path.join("password.txt");
        std::fs::write(&password_path, PASSWORD).context("Failed to write password file")?;

        let script_path = base_path.join("script.txt");
        let script_content = Self::generate_script(port, &firmware_path, &password_path)?;
        std::fs::write(&script_path, script_content).context("Failed to write script file")?;

        Ok(Self {
            _temp_dir: temp_dir,
            script_path,
        })
    }

    fn generate_script(
        port: &str,
        firmware_path: &PathBuf,
        password_path: &PathBuf,
    ) -> Result<String> {
        let firmware_str = firmware_path.to_str().context("Invalid firmware path")?;
        let password_str = password_path.to_str().context("Invalid password path")?;

        Ok(formatdoc! {"
            MODE FRxx UART {port} BAUD 9600 PARITY E
            DELAY 1000
            CHANGE_BAUD_RATE 115200
            RX_PASSWORD {password_str}
            RX_DATA_BLOCK {firmware_str}
            SET_PC 0x6586
        "})
    }
}

// --- Lock Management ---

async fn acquire_port_lock(state: &State<'_, Mutex<AppData>>, port: &str) -> Result<()> {
    let mut state = state.lock().await;
    if state.active_ports.contains(port) {
        anyhow::bail!("Port {} is already being flashed", port);
    }
    state.active_ports.insert(port.to_string());
    Ok(())
}

async fn release_port_lock(state: &State<'_, Mutex<AppData>>, port: &str) {
    let mut state = state.lock().await;
    state.active_ports.remove(port);
    state.bsl_children.remove(port);
}

// --- Process Management ---

#[derive(Debug)]
struct FlashResult {
    success: bool,
    exit_code: Option<i32>,
    timed_out: bool,
}

async fn handle_bsl_scripter_output(
    app: &tauri::AppHandle,
    port: String,
    mut rx: Receiver<CommandEvent>,
    _config: FlashConfig,
) -> FlashResult {
    let mut consecutive_ack_errors = 0;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes).to_string();

                if line.contains("[ACK_ERROR_MESSAGE]") {
                    consecutive_ack_errors += 1;
                    if consecutive_ack_errors >= MAX_CONSECUTIVE_ACK_ERRORS {
                        return FlashResult {
                            success: false,
                            exit_code: Some(1000),
                            timed_out: false,
                        };
                    }
                } else {
                    consecutive_ack_errors = 0;
                }

                let _ = app.emit(
                    "bsl-stdout",
                    FlashEvent {
                        port: port.clone(),
                        data: line,
                    },
                );
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes).to_string();
                let _ = app.emit(
                    "bsl-stderr",
                    FlashEvent {
                        port: port.clone(),
                        data: line,
                    },
                );
            }
            CommandEvent::Terminated(payload) => {
                return FlashResult {
                    success: payload.code.map_or(false, |c| c == 0),
                    exit_code: payload.code,
                    timed_out: false,
                };
            }
            _ => {}
        }
    }
    FlashResult {
        success: false,
        exit_code: None,
        timed_out: false,
    }
}

#[tauri::command]
pub async fn flash(
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppData>>,
    port: String,
) -> Result<(), String> {
    // 1. Lock this specific port
    acquire_port_lock(&state, &port)
        .await
        .map_err(|e| e.to_string())?;

    // 2. Setup config
    let config = FlashConfig::create(&port).map_err(|e| {
        let _ = tauri::async_runtime::block_on(async { release_port_lock(&state, &port).await });
        e.to_string()
    })?;

    // 3. Spawn Sidecar
    let (rx, child) = app
        .shell()
        .sidecar("bsl-scripter")
        .map_err(|e| e.to_string())?
        .arg(&config.script_path)
        .spawn()
        .map_err(|e| e.to_string())?;

    // 4. Store child in the map so we can kill it later if needed
    {
        let mut s = state.lock().await;
        s.bsl_children.insert(port.clone(), child);
    }

    // 5. Run process monitor in background
    let app_inner = app.clone();
    let port_inner = port.clone();

    tauri::async_runtime::spawn(async move {
        let state_inner = app_inner.state::<Mutex<AppData>>();
        let result = tokio::time::timeout(
            DEFAULT_TIMEOUT,
            handle_bsl_scripter_output(&app_inner, port_inner.clone(), rx, config),
        )
        .await;

        let final_result = match result {
            Ok(res) => res,
            Err(_) => FlashResult {
                success: false,
                exit_code: None,
                timed_out: true,
            },
        };

        // Emit final status
        let event_name = if final_result.success {
            "bsl-finished"
        } else if final_result.timed_out {
            "bsl-timeout"
        } else {
            "bsl-failed"
        };
        let _ = app_inner.emit(
            event_name,
            FlashEvent {
                port: port_inner.clone(),
                data: final_result.exit_code,
            },
        );

        // Cleanup: Kill process if still alive and remove from AppData
        let mut s = state_inner.lock().await;
        if let Some(child) = s.bsl_children.remove(&port_inner) {
            let _ = child.kill();
        }
        s.active_ports.remove(&port_inner);
    });

    Ok(())
}
