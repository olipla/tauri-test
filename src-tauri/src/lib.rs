use tauri::{window::Color, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_serialplugin::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let window = app.get_webview_window("main").unwrap();
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
