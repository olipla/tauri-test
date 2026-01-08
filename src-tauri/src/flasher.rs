use std::io::Write;

use tauri::async_runtime::Mutex;
use tauri::{Emitter, Manager, State};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tempfile::NamedTempFile;

use crate::AppData;

#[tauri::command]
pub async fn flash(
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppData>>,
    port: &str,
) -> Result<(), String> {
    {
        let mut state = state.lock().await;
        if state.bsl_flasher_running {
            return Err("Flasher already running".to_string());
        }
        state.bsl_flasher_running = true;
    }

    let firmware = include_bytes!("../firmware.txt");
    let password = include_bytes!("../password.txt");

    let (mut firmware_file, firmware_path) =
        NamedTempFile::with_suffix(".txt").unwrap().keep().unwrap();
    let firmware_path_str = firmware_path.to_str().unwrap();
    firmware_file.write_all(firmware).unwrap();

    let (mut password_file, password_path) =
        NamedTempFile::with_suffix(".txt").unwrap().keep().unwrap();
    let password_path_str = password_path.to_str().unwrap();
    password_file.write_all(password).unwrap();

    // let path = file1.path().to_str().unwrap();

    let file0 = NamedTempFile::with_suffix(".txt").unwrap();
    let (mut file1, path) = file0.keep().unwrap();
    log::info!("{}", path.to_str().unwrap());

    let text = format!(
        "MODE FRxx UART {port} BAUD 9600 PARITY E
DELAY 1000
CHANGE_BAUD_RATE 115200
RX_PASSWORD {password_path_str}
RX_DATA_BLOCK {firmware_path_str}
SET_PC 0x6586
"
    );
    file1.write_all(text.as_bytes()).unwrap();

    let sidecar_command = app.shell().sidecar("bsl-scripter").unwrap().arg(path);
    // sidecar_command
    let (mut rx, mut child) = sidecar_command.spawn().expect("Failed to spawn sidecar");

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        // let (file, path) = file1.keep().unwrap();
        // log::info!("{}", file1.path().to_str().unwrap());
        // read events such as stdout
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line_bytes) = event {
                let line = String::from_utf8_lossy(&line_bytes);
                log::info!("{}", line);
                app.emit("message", Some(format!("'{}'", line)))
                    .expect("failed to emit event");
                // write to stdin
                //   child.write("message from Rust\n".as_bytes()).unwrap();
            }
        }
        log::info!("SIDECAR FINISHED");
        app.emit("bsl-finished", ()).unwrap();
        let state: State<Mutex<AppData>> = app.try_state().unwrap();
        let mut state = state.lock().await;
        state.bsl_flasher_running = false;
    });
    Ok(())
}
