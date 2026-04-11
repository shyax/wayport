use comfy_table::{Cell, Color};
use wayport_core::{config, database::Database, pid};
use crate::output;

pub fn run(json: bool) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let active = pid::list_active_tunnels();

    if active.is_empty() {
        if json {
            println!("[]");
        } else {
            println!("No active tunnels");
        }
        return Ok(());
    }

    if json {
        let entries: Vec<_> = active.iter().filter_map(|(profile_id, pid, source)| {
            let profiles = db.get_profiles("local");
            let profile = profiles.iter().find(|p| p.id == *profile_id)?;
            Some(serde_json::json!({
                "name": profile.name,
                "local_port": profile.local_port,
                "remote": format!("{}:{}", profile.remote_host.as_deref().unwrap_or("-"), profile.remote_port.unwrap_or(0)),
                "pid": pid,
                "source": source.to_string(),
            }))
        }).collect();
        println!("{}", serde_json::to_string_pretty(&entries).unwrap_or_default());
        return Ok(());
    }

    let mut table = output::table(&["Tunnel", "Local", "Remote", "Status", "Source", "PID"]);
    let profiles = db.get_profiles("local");

    for (profile_id, child_pid, source) in &active {
        let profile = profiles.iter().find(|p| p.id == *profile_id);
        let name = profile.map(|p| p.name.as_str()).unwrap_or("unknown");
        let local = profile.map(|p| format!("localhost:{}", p.local_port)).unwrap_or_default();
        let remote = profile.map(|p| {
            format!("{}:{}", p.remote_host.as_deref().unwrap_or("-"), p.remote_port.unwrap_or(0))
        }).unwrap_or_default();

        table.add_row(vec![
            Cell::new(name),
            Cell::new(&local),
            Cell::new(&remote),
            Cell::new("● Active").fg(Color::Green),
            Cell::new(source.to_string()),
            Cell::new(child_pid),
        ]);
    }

    println!("{table}");
    Ok(())
}
