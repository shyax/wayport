use porthole_core::{config, database::Database, pid};

pub fn run(workspace: &str, name: &str) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let profile = db.get_profile_by_name(workspace, name)
        .ok_or_else(|| format!("Profile \"{}\" not found", name))?;

    // Check if tunnel has a log file
    let log_path = config::tunnels_dir().join(format!("{}.log", profile.id));
    if log_path.exists() {
        let content = std::fs::read_to_string(&log_path)
            .map_err(|e| format!("Failed to read log: {}", e))?;
        print!("{}", content);
        return Ok(());
    }

    // Check if tunnel is running (PID file exists)
    if let Some((child_pid, _)) = pid::read_pid(&profile.id) {
        if pid::is_process_alive(child_pid) {
            println!("Tunnel \"{}\" is active (PID {}) but no log file found.", name, child_pid);
            println!("Logs are only captured for detached tunnels.");
            return Ok(());
        }
    }

    println!("No logs available for \"{}\". Tunnel is not running.", name);
    Ok(())
}
