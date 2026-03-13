use anyhow::{anyhow, Context, Result};
// use std::path::BufReader;
use std::path::PathBuf;
use std::time::Duration;

use indoc::{formatdoc, indoc};
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

macro_rules! firmware {
    () => {
        "GW_v4_Nb_2_1_9_ses"
    };
}

const PASSWORD_INCORRECT_CONTENTS: &str = indoc! {"
        @FFE0
        00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
        00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
        q
    "};

const PASSWORD_BLANK_CONTENTS: &str = indoc! {"
        @FFE0
        FF FF FF FF FF FF FF FF FF FF FF FF FF FF FF FF
        FF FF FF FF FF FF FF FF FF FF FF FF FF FF FF FF
        q
    "};

pub const FIRMWARE_NAME: &str = firmware!();
const FIRMWARE: &[u8] = include_bytes!(concat!("../firmware/", firmware!(), ".txt"));
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(25);
const MAX_CONSECUTIVE_ACK_ERRORS: i32 = 5;

fn extract_entrypoint(firmware: &[u8]) -> Result<String, anyhow::Error> {
    let firmware_str = String::from_utf8_lossy(firmware).to_string();
    println!("Firmware: {}", firmware_str);

    for (i, line) in firmware_str.lines().enumerate() {
        if line.contains("@ffd0") {
            if let Some(target_line) = firmware_str.lines().nth(i + 3) {
                let parts: Vec<&str> = target_line.split_whitespace().collect();
                if parts.len() > 14 {
                    let result = format!("{}{}", parts[13], parts[14]);
                    return Ok(result);
                }
            }
            break;
        }
    }
    Err(anyhow!("Failed to extract entrypoint"))
}

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

        let password_incorrect_path = base_path.join("password_incorrect.txt");
        std::fs::write(&password_incorrect_path, PASSWORD_INCORRECT_CONTENTS)
            .context("Failed to write incorrect password file")?;

        let password_blank_path = base_path.join("password_blank.txt");
        std::fs::write(&password_blank_path, PASSWORD_BLANK_CONTENTS)
            .context("Failed to write incorrect password file")?;

        let script_path = base_path.join("script.txt");

        let entrypoint = extract_entrypoint(FIRMWARE)?;
        let script_content = Self::generate_script(
            port,
            &firmware_path,
            &password_incorrect_path,
            &password_blank_path,
            &entrypoint,
        )?;
        std::fs::write(&script_path, script_content).context("Failed to write script file")?;

        Ok(Self {
            _temp_dir: temp_dir,
            script_path,
        })
    }

    fn generate_script(
        port: &str,
        firmware_path: &PathBuf,
        password_incorrect_path: &PathBuf,
        password_blank_path: &PathBuf,
        entrypoint: &str,
    ) -> Result<String> {
        let firmware_str = firmware_path.to_str().context("Invalid firmware path")?;
        let password_incorrect_str = password_incorrect_path
            .to_str()
            .context("Invalid incorrect password path")?;
        let password_blank_str = password_blank_path
            .to_str()
            .context("Invalid blank password path")?;

        // pre 2.1.9 PC = 0x6586
        // post PC = 0x6592

        Ok(formatdoc! {"
            MODE FRxx UART {port} BAUD 9600 PARITY E
            CHANGE_BAUD_RATE 115200
            RX_PASSWORD {password_incorrect_str}
            RX_DATA_BLOCK {firmware_str}
            REBOOT_RESET
            MODE FRxx UART {port} BAUD 9600 PARITY E
            CHANGE_BAUD_RATE 115200
            RX_PASSWORD {password_blank_str}
            RX_DATA_BLOCK {firmware_str}
            SET_PC 0x{entrypoint}
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
                println!("[SIDECAR STDOUT - {}] {}", port, line.trim());

                if line.contains("Access is denied") {
                    return FlashResult {
                        success: false,
                        exit_code: Some(1001),
                        timed_out: false,
                    };
                }

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
                println!("[SIDECAR STDERR - {}] {}", port, line.trim());
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
    println!(
        "\n[DIAGNOSTIC] === Starting flash sequence for {} ===",
        port
    );

    // 1. Lock this specific port
    acquire_port_lock(&state, &port).await.map_err(|e| {
        println!("[DIAGNOSTIC] Lock failed for {}: {}", port, e);
        e.to_string()
    })?;

    // 2. Setup config
    let config = FlashConfig::create(&port).map_err(|e| {
        println!("[DIAGNOSTIC] Config creation failed for {}: {}", port, e);
        let _ = tauri::async_runtime::block_on(async { release_port_lock(&state, &port).await });
        e.to_string()
    })?;

    println!(
        "[DIAGNOSTIC] Temp dir created at: {:?}",
        config._temp_dir.path()
    );
    println!("[DIAGNOSTIC] Script content path: {:?}", config.script_path);

    // Log the actual script content to verify no weird formatting issues
    if let Ok(content) = std::fs::read_to_string(&config.script_path) {
        println!(
            "[DIAGNOSTIC] Script Content:\n---BEGIN---\n{}\n---END---",
            content
        );
    }

    // 3. Spawn Sidecar
    let (rx, child) = app
        .shell()
        .sidecar("bsl-scripter")
        .map_err(|e| e.to_string())?
        .arg(&config.script_path)
        .current_dir(config._temp_dir.path().to_path_buf())
        .spawn()
        .map_err(|e| {
            println!("[DIAGNOSTIC] Sidecar spawn failed for {}: {}", port, e);
            let _ =
                tauri::async_runtime::block_on(async { release_port_lock(&state, &port).await });
            e.to_string()
        })?;

    println!(
        "[DIAGNOSTIC] Sidecar spawned successfully for {} with PID: {:?}",
        port,
        child.pid()
    );

    // 4. Store child in the map so we can kill it later if needed
    {
        let mut s = state.lock().await;
        s.bsl_children.insert(port.clone(), child);
    }

    // 5. Run process monitor in background
    let app_inner = app.clone();
    let port_inner = port.clone();

    tauri::async_runtime::spawn(async move {
        println!("[DIAGNOSTIC] Monitoring thread started for {}", port_inner);
        let state_inner = app_inner.state::<Mutex<AppData>>();
        let result = tokio::time::timeout(
            DEFAULT_TIMEOUT,
            handle_bsl_scripter_output(&app_inner, port_inner.clone(), rx, config),
        )
        .await;

        let final_result = match result {
            Ok(res) => {
                println!(
                    "[DIAGNOSTIC] Process for {} terminated naturally. Success: {}, Code: {:?}",
                    port_inner, res.success, res.exit_code
                );
                res
            }
            Err(_) => {
                println!(
                    "[DIAGNOSTIC] Process for {} TIMED OUT after {:?}",
                    port_inner, DEFAULT_TIMEOUT
                );
                FlashResult {
                    success: false,
                    exit_code: None,
                    timed_out: true,
                }
            }
        };

        // Cleanup: Kill process if still alive and remove from AppData
        let mut s = state_inner.lock().await;
        if let Some(child) = s.bsl_children.remove(&port_inner) {
            let _ = child.kill();
        }
        s.active_ports.remove(&port_inner);

        println!(
            "[DIAGNOSTIC] Cleanup complete for {}. Mutex released.\n",
            port_inner
        );

        // Emit final status
        let event_name = if final_result.success {
            "bsl-finished"
        } else if final_result.timed_out {
            "bsl-timeout"
        } else {
            "bsl-failed"
        };

        println!(
            "[DIAGNOSTIC] Emitting event '{}' for port {}",
            event_name, port_inner
        );

        let _ = app_inner.emit(
            event_name,
            FlashEvent {
                port: port_inner.clone(),
                data: final_result.exit_code,
            },
        );
    });

    Ok(())
}
