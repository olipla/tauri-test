use printers::common::base::printer::{Printer, PrinterState};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(remote = "PrinterState")]
pub enum PrinterStateDef {
    READY,
    OFFLINE,
    PAUSED,
    PRINTING,
    UNKNOWN,
}

#[derive(Serialize)]
#[serde(remote = "Printer")]
struct PrinterDef {
    pub name: String,
    pub system_name: String,
    pub driver_name: String,
    pub uri: String,
    pub port_name: String,
    pub processor: String,
    pub data_type: String,
    pub description: String,
    pub location: String,
    pub is_default: bool,
    pub is_shared: bool,
    #[serde(with = "PrinterStateDef")]
    pub state: PrinterState,
    pub state_reasons: Vec<String>,
}

#[derive(Serialize)]
pub struct PrinterList(
    #[serde(with = "printer_list_def")] 
    pub Vec<Printer>
);

mod printer_list_def {
    use super::*;
    use serde::{Serializer, Serialize};

    pub fn serialize<S>(printers: &Vec<Printer>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        #[derive(Serialize)]
        struct Wrapper<'a>(#[serde(with = "PrinterDef")] &'a Printer);
        
        serializer.collect_seq(printers.iter().map(Wrapper))
    }
}

#[tauri::command]
pub fn get_printers() -> PrinterList {
    let printers = printers::get_printers();
    
    PrinterList(printers)
}

#[tauri::command]
pub fn print_file() {
    println!("I was invoked from JavaScript!");
}
