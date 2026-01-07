use tauri::Emitter;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tempfile::NamedTempFile;

use std::fs::File;
use std::io::{Read, Seek, SeekFrom, Write};

#[tauri::command]
pub async fn flash(app: tauri::AppHandle, port: &str) -> Result<(), String> {
    let firmware = include_bytes!("../firmware.txt");
    let password = include_bytes!("../password.txt");

    let (mut firmware_file, firmware_path) = NamedTempFile::with_suffix(".txt").unwrap().keep().unwrap();
    let firmware_path_str = firmware_path.to_str().unwrap();
    firmware_file.write_all(firmware).unwrap();

    let (mut password_file, password_path) = NamedTempFile::with_suffix(".txt").unwrap().keep().unwrap();
    let password_path_str = password_path.to_str().unwrap();
    password_file.write_all(password).unwrap();

    // let path = file1.path().to_str().unwrap();

    let file0 = NamedTempFile::with_suffix(".txt").unwrap();
    let (mut file1, path) =  file0.keep().unwrap();
    log::info!("{}", path.to_str().unwrap());

    let text = format!("MODE FRxx UART {port} BAUD 9600 PARITY E
DELAY 1000
CHANGE_BAUD_RATE 115200
RX_PASSWORD {password_path_str}
RX_DATA_BLOCK {firmware_path_str}
SET_PC 0x6586
");
    file1.write_all(text.as_bytes()).unwrap();
    

    let sidecar_command = app.shell().sidecar("bsl-scripter").unwrap().arg(path);
    // sidecar_command
    let (mut rx, mut child) = sidecar_command.spawn().expect("Failed to spawn sidecar");

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
        log::info!("SIDECAR FINISHED")
    });
    Ok(())
}
