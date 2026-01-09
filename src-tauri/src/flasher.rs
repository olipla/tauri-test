use anyhow::{Context, Result};
use std::path::PathBuf;
use std::time::Duration;

use indoc::formatdoc;
use tauri::async_runtime::{Mutex, Receiver};
use tauri::{Emitter, Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tempfile::TempDir;

use crate::AppData;

/// Embedded firmware and password files
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

        log::info!("Created BSL files in: {}", base_path.display());

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

async fn acquire_flasher_lock(state: &State<'_, Mutex<AppData>>) -> Result<()> {
    let mut state = state.lock().await;

    if state.bsl_flasher_running {
        anyhow::bail!("Flasher is already running");
    }

    state.bsl_flasher_running = true;
    Ok(())
}

async fn release_flasher_lock(state: &State<'_, Mutex<AppData>>) {
    let mut state = state.lock().await;
    state.bsl_flasher_running = false;
}

fn release_flasher_lock_with_app(app: &tauri::AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Some(state) = app.try_state::<Mutex<AppData>>() {
            release_flasher_lock(&state).await;
        } else {
            log::error!("Failed to access app state to release flasher lock");
        }
    });
}

#[derive(Debug)]
struct FlashResult {
    success: bool,
    exit_code: Option<i32>,
    timed_out: bool,
}

async fn handle_bsl_scripter_output(
    app: &tauri::AppHandle,
    mut rx: Receiver<CommandEvent>,
    _config: FlashConfig, // Keep config alive while processing events
) -> FlashResult {
    let mut consecutive_ack_errors = 0;
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes);
                log::info!("BSL Scripter: {}", line);

                if line.contains("[ACK_ERROR_MESSAGE]") {
                    consecutive_ack_errors += 1;
                    if consecutive_ack_errors >= MAX_CONSECUTIVE_ACK_ERRORS {
                        log::error!(
                            "BSL Scripter returned too many ack errors: {}",
                            consecutive_ack_errors
                        );
                        return FlashResult {
                            success: false,
                            exit_code: Some(1000),
                            timed_out: false,
                        };
                    }
                } else {
                    consecutive_ack_errors = 0;
                }

                if let Err(e) = app.emit("bsl-stdout", line.to_string()) {
                    log::error!("Failed to emit bsl-stdout event: {}", e);
                }
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes);
                log::error!("BSL Error: {}", line);

                if let Err(e) = app.emit("bsl-stderr", line.to_string()) {
                    log::error!("Failed to emit bsl-stderr event: {}", e);
                }
            }
            CommandEvent::Error(err) => {
                log::error!("BSL Scripter process error: {}", err);
            }
            CommandEvent::Terminated(payload) => {
                log::info!("BSL process terminated with code: {:?}", payload.code);

                let success = payload.code.map_or(false, |code| code == 0);
                return FlashResult {
                    success,
                    exit_code: payload.code,
                    timed_out: false,
                };
            }
            _ => {}
        }
    }

    // A terminate event should always occur before the loop finishing
    // If something goes wrong and it doesn't, return a 'None' exit code
    log::error!("BSL Scripter process ended without termination event");
    FlashResult {
        success: false,
        exit_code: None,
        timed_out: false,
    }
}

async fn cleanup_flash(app: &tauri::AppHandle, result: FlashResult, child: CommandChild) {
    if result.success {
        log::info!("BSL Scripter finished successfully");
        if let Err(e) = app.emit("bsl-finished", ()) {
            log::error!("Failed to emit bsl-finished event: {}", e);
        }
    } else if result.timed_out {
        log::error!("BSL Scripter timed out");
        if let Err(e) = app.emit("bsl-timeout", ()) {
            log::error!("Failed to emit bsl-timeout event: {}", e);
        }
    } else {
        log::error!("BSL Scripter failed with exit code: {:?}", result.exit_code);
        if let Err(e) = app.emit("bsl-failed", result.exit_code) {
            log::error!("Failed to emit bsl-failed event: {}", e);
        }
    }

    // Ensure BSL scripter is always killed
    if let Err(e) = child.kill() {
        log::error!("Failed to kill BSL scripter: {}", e);
    }

    // Release the lock
    if let Some(state) = app.try_state::<Mutex<AppData>>() {
        release_flasher_lock(&state).await;
    } else {
        log::error!("Failed to access app state to release flasher lock");
    }
}

#[tauri::command]
pub async fn flash(
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppData>>,
    port: &str,
) -> Result<(), String> {
    acquire_flasher_lock(&state)
        .await
        .map_err(|e| e.to_string())?;

    let config = FlashConfig::create(port).map_err(|e| {
        // Release lock on error
        release_flasher_lock_with_app(&app);
        e.to_string()
    })?;

    let sidecar_command = app
        .shell()
        .sidecar("bsl-scripter")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .arg(&config.script_path);

    let (rx, child) = sidecar_command.spawn().map_err(|e| {
        // Release lock on error
        release_flasher_lock_with_app(&app);
        format!("Failed to spawn BSL scripter: {}", e)
    })?;

    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        let result = tokio::time::timeout(
            DEFAULT_TIMEOUT,
            handle_bsl_scripter_output(&app_clone, rx, config),
        )
        .await;

        match result {
            Ok(flash_result) => {
                // Process completed within timeout
                cleanup_flash(&app_clone, flash_result, child).await;
            }
            Err(_) => {
                // Timeout occurred - kill the process
                log::error!(
                    "Flash operation timed out after {} seconds",
                    DEFAULT_TIMEOUT.as_secs()
                );

                cleanup_flash(
                    &app_clone,
                    FlashResult {
                        success: false,
                        exit_code: None,
                        timed_out: true,
                    },
                    child,
                )
                .await;
            }
        }
    });

    Ok(())
}
