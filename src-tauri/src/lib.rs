use tauri::{async_runtime::Mutex, window::Color, Manager};

mod flasher;
mod printer;

pub struct AppData {
    bsl_flasher_running: bool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            printer::get_printers,
            printer::print_data,
            printer::get_printer,
            flasher::flash,
        ])
        .plugin(tauri_plugin_serialplugin::init())
        .setup(|app| {
            app.manage(Mutex::new(AppData {
                bsl_flasher_running: false,
            }));

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .level_for("printer_event_handler", log::LevelFilter::Warn)
                        .build(),
                )?;
            }

            let window = app.get_webview_window("main").unwrap();
            let version = app.package_info().version.to_string();

            let _ = window.set_title(&format!("Jellyfish Configurator {version}"));
            if let Ok(theme) = window.theme() {
                match theme {
                    tauri::Theme::Dark => {
                        window.set_background_color(Some(Color(28, 25, 25, 255)))?;
                    }
                    tauri::Theme::Light => {
                        window.set_background_color(Some(Color(255, 255, 255, 255)))?;
                    }
                    _ => {}
                }
            }

            window.show().unwrap();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
