use comfy_table::{Cell, Color};
use porthole_core::port_utils;
use crate::output;

pub fn run(port_arg: &str, json: bool) -> Result<(), String> {
    let results = if port_arg.contains('-') {
        let parts: Vec<&str> = port_arg.splitn(2, '-').collect();
        let start: u16 = parts[0].parse().map_err(|_| "Invalid start port")?;
        let end: u16 = parts[1].parse().map_err(|_| "Invalid end port")?;
        port_utils::scan_port_range(start, end)?
    } else {
        let port: u16 = port_arg.parse().map_err(|_| "Invalid port number")?;
        port_utils::scan_port(port)?
    };

    if json {
        println!("{}", serde_json::to_string_pretty(&results).unwrap_or_default());
        return Ok(());
    }

    if results.is_empty() {
        println!("No processes found on port {}", port_arg);
        return Ok(());
    }

    let mut table = output::table(&["Port", "PID", "Process", "State", "Local Addr", "Remote Addr"]);
    for r in &results {
        let state_color = match r.state.as_str() {
            "LISTEN" => Color::Green,
            "ESTABLISHED" => Color::Cyan,
            _ => Color::DarkGrey,
        };
        table.add_row(vec![
            Cell::new(r.port),
            Cell::new(r.pid.map(|p| p.to_string()).unwrap_or("-".into())),
            Cell::new(r.process_name.as_deref().unwrap_or("-")),
            Cell::new(&r.state).fg(state_color),
            Cell::new(&r.local_addr),
            Cell::new(r.remote_addr.as_deref().unwrap_or("-")),
        ]);
    }

    println!("{table}");
    Ok(())
}
