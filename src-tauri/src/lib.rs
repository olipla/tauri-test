use anyhow::{Context, Result};
use tauri::{async_runtime::Mutex, window::Color, Manager};

mod flasher;
mod printer;

/// Global Tauri application state
#[derive(Default)]
pub struct AppData {
    /// Flag to prevent multiple flashers running at the same time
    bsl_flasher_running: bool,
}

impl AppData {
    fn new() -> Self {
        Self {
            bsl_flasher_running: false,
        }
    }
}

/// Configure appearance and title of main window
fn configure_window(window: &tauri::WebviewWindow, version: &str) -> Result<()> {
    window
        .set_title(&format!("Jellyfish Configurator {version}"))
        .context("Failed to set window title")?;

    // Set background colour to match Nuxt theme to avoid flash when starting
    if let Ok(theme) = window.theme() {
        let background_colour = match theme {
            tauri::Theme::Light => Color(255, 255, 255, 255),
            _ => Color(28, 25, 25, 255),
        };

        window
            .set_background_color(Some(background_colour))
            .context("Failed to set window background colour")
            .context(theme)?;
    }

    // The main window is hidden by default, show it now dynamic configuration has been applied
    window.show().context("Failed to show window")?;

    Ok(())
}

fn setup_logging(app: &tauri::App) -> Result<()> {
    if cfg!(debug_assertions) {
        app.handle()
            .plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    // Stop console spam when polling printer status
                    .level_for("printer_event_handler", log::LevelFilter::Warn)
                    .build(),
            )
            .context("Failed to setup Tauri logging plugin")?;
    }

    Ok(())
}

fn setup_app(app: &mut tauri::App) -> Result<()> {
    app.manage(Mutex::new(AppData::new()));

    setup_logging(app)?;

    let window = app
        .get_webview_window("main")
        .context("Could not find main window")?;

    let version = app.package_info().version.to_string();

    configure_window(&window, &version)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_serialplugin::init())
        .invoke_handler(tauri::generate_handler![
            printer::get_printers,
            printer::print_data,
            printer::get_printer,
            flasher::flash,
        ])
        .setup(|app| setup_app(app).map_err(Into::into))
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application!");
}
