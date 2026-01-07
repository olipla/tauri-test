use printer_event_handler::{PrinterError, PrinterMonitor};
use printers::common::base::job::PrinterJobOptions;
use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
pub struct PrinterSummary {
    pub name: String,
    pub status: String,
    pub state: String,
    pub error_state: String,
    pub is_offline: bool,
    pub is_default: bool,
    pub uri: String,
    pub port_name: String,
    pub is_shared: bool,
    pub location: String,
    pub processor: String,
    pub data_type: String,
    pub description: String,
}

#[derive(Serialize, Debug, Clone)]
pub struct PrinterShortSummary {
    pub name: String,
    pub status: String,
    pub state: String,
    pub error_state: String,
    pub is_offline: bool,
    pub is_default: bool,
}

pub async fn get_printer_summaries() -> Result<Vec<PrinterSummary>, PrinterError> {
    let peh_monitor = PrinterMonitor::new().await?;
    let peh_printers = peh_monitor.list_printers().await?;

    let printers = printers::get_printers();

    let mut summaries: Vec<PrinterSummary> = Vec::new();

    for peh_printer in &peh_printers {
        let name = peh_printer.name();
        let Some(printer) = printers.iter().find(|&printer| printer.name.eq(name)) else {
            continue;
        };

        let state_str = match peh_printer.state() {
            Some(s) => format!("{:?}", s),
            None => "".to_string(),
        };

        summaries.push(PrinterSummary {
            name: peh_printer.name().to_string(),
            status: format!("{:?}", peh_printer.status()),
            state: state_str,
            error_state: peh_printer.error_state().to_string(),
            is_offline: peh_printer.is_offline(),
            is_default: peh_printer.is_default(),
            uri: printer.uri.clone(),
            port_name: printer.port_name.clone(),
            is_shared: printer.is_shared.clone(),
            location: printer.location.clone(),
            processor: printer.processor.clone(),
            data_type: printer.data_type.clone(),
            description: printer.description.clone(),
        });
    }

    Ok(summaries)
}

pub async fn get_printer_status(
    printer_name: &str,
) -> Result<Option<PrinterShortSummary>, PrinterError> {
    let peh_monitor = PrinterMonitor::new().await?;
    Ok(match peh_monitor.find_printer(printer_name).await? {
        None => None,
        Some(peh_printer) => {
            let state_str = match peh_printer.state() {
                Some(s) => format!("{:?}", s),
                None => "".to_string(),
            };
            Some(PrinterShortSummary {
                name: peh_printer.name().to_string(),
                status: format!("{:?}", peh_printer.status()),
                state: state_str,
                error_state: peh_printer.error_state().to_string(),
                is_offline: peh_printer.is_offline(),
                is_default: peh_printer.is_default(),
            })
        }
    })
}

#[derive(Serialize)]
pub struct PrinterSummaries(pub Vec<PrinterSummary>);

#[tauri::command]
pub async fn get_printers() -> Result<PrinterSummaries, String> {
    let printers = get_printer_summaries()
        .await
        .map_err(|err| err.to_string())?;

    Ok(PrinterSummaries(printers))
}

#[tauri::command]
pub async fn get_printer(printer_name: &str) -> Result<PrinterShortSummary, String> {
    get_printer_status(printer_name)
        .await
        .map_err(|err| err.to_string())?
        .ok_or("Printer not found!".to_string())
}

#[tauri::command]
pub fn print_data(printer_name: &str, data: &str) -> Result<u64, String> {
    let printer = printers::get_printer_by_name(printer_name).ok_or("Printer not found!")?;

    let job_id = printer.print(data.as_bytes(), PrinterJobOptions::none())?;

    Ok(job_id)
}
