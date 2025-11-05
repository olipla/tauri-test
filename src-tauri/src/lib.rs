use tauri::{window::Color, Manager};

mod printer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![printer::get_printers, printer::print_file])
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

            for printer in printers::get_printers() {
                println!("{:?}", printer);
            }

            let my_printer = printers::get_printer_by_name("ZDesigner ZD621-300dpi ZPL");

            if my_printer.is_some() {
                println!("PRINTER EXISTS");
                // let _job_id = my_printer.unwrap().print_file("C:/b4tate/labels/300_dpi_bridge_ses_sigfox.zpl", printers::common::base::job::PrinterJobOptions::none());
                // let job_id = my_printer.unwrap().print_file("notes.txt", PrinterJobOptions::none());
                // Err("...") or Ok(())
            }


            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
