use porthole_core::{config, database::Database, tunnel_manager::TunnelManager, pid, types::ActionSource, history};
use crate::output;

pub fn run(workspace: &str, name: &str, detach: bool) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let profile = db.get_profile_by_name(workspace, name)
        .ok_or_else(|| format!("Profile \"{}\" not found. Run `porthole ls` to see available profiles.", name))?;

    // Check if already connected via PID file
    if let Some((pid, _)) = pid::read_pid(&profile.id) {
        if pid::is_process_alive(pid) {
            return Err(format!("\"{}\" is already connected (PID {})", name, pid));
        }
        pid::remove_pid(&profile.id);
    }

    // Check port availability
    if let Ok(false) = porthole_core::port_utils::check_port_available(profile.local_port) {
        return Err(format!("Port {} is already in use", profile.local_port));
    }

    let remote = match (&profile.remote_host, profile.remote_port) {
        (Some(h), Some(p)) => format!("{}:{}", h, p),
        _ => "tunnel".to_string(),
    };

    if detach {
        // Detached mode: spawn SSH directly and record PID
        let args = TunnelManager::build_ssh_args(&profile);
        let child = std::process::Command::new("ssh")
            .args(&args)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to start SSH: {}", e))?;

        let child_pid = child.id();
        pid::write_pid(&profile.id, child_pid, ActionSource::Cli)?;

        history::record_action(
            &db, workspace, Some(&profile.id), &profile.name,
            "connect", ActionSource::Cli,
            Some(format!("localhost:{} -> {}", profile.local_port, remote)),
            None,
        )?;

        output::success(&format!(
            "Connected \x1b[1m{}\x1b[0m — localhost:{} → {}",
            name, profile.local_port, remote
        ));
        output::info(&format!("Running in background (PID {})", child_pid));
    } else {
        // Foreground mode: spawn and wait
        let args = TunnelManager::build_ssh_args(&profile);
        let mut child = std::process::Command::new("ssh")
            .args(&args)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start SSH: {}", e))?;

        let child_pid = child.id();
        pid::write_pid(&profile.id, child_pid, ActionSource::Cli)?;

        history::record_action(
            &db, workspace, Some(&profile.id), &profile.name,
            "connect", ActionSource::Cli,
            Some(format!("localhost:{} -> {}", profile.local_port, remote)),
            None,
        )?;

        output::success(&format!(
            "Connected \x1b[1m{}\x1b[0m — localhost:{} → {}",
            name, profile.local_port, remote
        ));
        output::info("Press Ctrl+C to disconnect");

        // Wait for process to exit
        let status = child.wait().map_err(|e| e.to_string())?;
        pid::remove_pid(&profile.id);

        history::record_action(
            &db, workspace, Some(&profile.id), &profile.name,
            "disconnect", ActionSource::Cli,
            Some(format!("Exit code: {:?}", status.code())),
            None,
        ).ok();

        if !status.success() {
            return Err(format!("SSH exited with code {:?}", status.code()));
        }
    }

    Ok(())
}
