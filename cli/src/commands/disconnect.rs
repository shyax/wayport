use porthole_core::{config, database::Database, pid, types::ActionSource, history};
use crate::output;

pub fn run(workspace: &str, name: &str) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let profile = db.get_profile_by_name(workspace, name)
        .ok_or_else(|| format!("Profile \"{}\" not found", name))?;

    let (child_pid, _) = pid::read_pid(&profile.id)
        .ok_or_else(|| format!("\"{}\" is not connected", name))?;

    if !pid::is_process_alive(child_pid) {
        pid::remove_pid(&profile.id);
        return Err(format!("\"{}\" is not connected (stale PID file cleaned)", name));
    }

    // Kill the SSH process
    unsafe { libc::kill(child_pid as i32, libc::SIGTERM); }
    pid::remove_pid(&profile.id);

    history::record_action(
        &db, workspace, Some(&profile.id), &profile.name,
        "disconnect", ActionSource::Cli, None, None,
    ).ok();

    output::success(&format!("Disconnected — {}", name));
    Ok(())
}
