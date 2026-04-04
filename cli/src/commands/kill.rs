use porthole_core::port_utils;
use crate::output;

pub fn run(port: u16) -> Result<(), String> {
    let msg = port_utils::kill_port(port)?;
    if msg.contains("Killed") {
        output::success(&msg);
    } else {
        println!("{}", msg);
    }
    Ok(())
}
