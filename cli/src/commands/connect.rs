use wayport_core::{config, database::Database, tunnel_manager::TunnelManager, pid, types::{ActionSource, ForwardingType}, history};
use crate::output;

fn resolve(s: &str, vars: &std::collections::HashMap<String, String>) -> String {
    let mut result = s.to_string();
    for (k, v) in vars {
        result = result.replace(&format!("{{{{{}}}}}", k), v);
    }
    result
}

pub fn run(workspace: &str, name: &str, detach: bool) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let mut profile = db.get_profile_by_name(workspace, name)
        .ok_or_else(|| format!("Profile \"{}\" not found. Run `wayport ls` to see available profiles.", name))?;

    // Apply active environment variables
    let envs = db.get_environments(workspace);
    if let Some(env) = envs.iter().find(|e| e.is_default).or_else(|| envs.first()) {
        let vars = &env.variables;
        profile.ssh_user = resolve(&profile.ssh_user, vars);
        profile.bastion_host = resolve(&profile.bastion_host, vars);
        profile.identity_file = resolve(&profile.identity_file, vars);
        if let Some(ref h) = profile.remote_host.clone() {
            profile.remote_host = Some(resolve(h, vars));
        }
    }

    // Check if already connected via PID file
    if let Some((pid, _)) = pid::read_pid(&profile.id) {
        if pid::is_process_alive(pid) {
            return Err(format!("\"{}\" is already connected (PID {})", name, pid));
        }
        pid::remove_pid(&profile.id);
    }

    // Check port availability
    if let Ok(false) = wayport_core::port_utils::check_port_available(profile.local_port) {
        return Err(format!("Port {} is already in use", profile.local_port));
    }

    let is_k8s = profile.forwarding_type == ForwardingType::Kubernetes;
    let (cmd, args) = if is_k8s {
        ("kubectl".to_string(), TunnelManager::build_kubectl_args(&profile))
    } else {
        ("ssh".to_string(), TunnelManager::build_ssh_args(&profile))
    };

    let remote = if is_k8s {
        format!("{}:{}", profile.k8s_resource.as_deref().unwrap_or("pod"), profile.k8s_resource_port.unwrap_or(0))
    } else {
        match (&profile.remote_host, profile.remote_port) {
            (Some(h), Some(p)) => format!("{}:{}", h, p),
            _ => "tunnel".to_string(),
        }
    };

    if detach {
        // Detached mode: spawn process directly and record PID
        let child = std::process::Command::new(&cmd)
            .args(&args)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to start {}: {}", cmd, e))?;

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
        let mut child = std::process::Command::new(&cmd)
            .args(&args)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start {}: {}", cmd, e))?;

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
