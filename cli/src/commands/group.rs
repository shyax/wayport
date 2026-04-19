use crate::output;
use wayport_core::{
    config, database::Database, history, pid, tunnel_manager::TunnelManager, types::ActionSource,
};

pub fn list(workspace: &str, json: bool) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let groups = db.get_groups(workspace);

    if json {
        let json_str = serde_json::to_string_pretty(&groups).map_err(|e| e.to_string())?;
        println!("{}", json_str);
        return Ok(());
    }

    if groups.is_empty() {
        output::info("No tunnel groups defined. Use `wayport group create <name> <profiles...>` to create one.");
        return Ok(());
    }

    let db_profiles = db.get_profiles(workspace);
    println!("{:<20} {:<6} PROFILES", "GROUP", "COUNT");
    println!("{}", "-".repeat(60));
    for group in &groups {
        let names: Vec<String> = group
            .profile_ids
            .iter()
            .filter_map(|id| {
                db_profiles
                    .iter()
                    .find(|p| &p.id == id)
                    .map(|p| p.name.clone())
            })
            .collect();
        println!(
            "{:<20} {:<6} {}",
            group.name,
            group.profile_ids.len(),
            names.join(", ")
        );
    }
    Ok(())
}

pub fn create(workspace: &str, name: &str, profile_names: &[String]) -> Result<(), String> {
    let db = Database::new(config::db_path());

    // Resolve profile names to IDs
    let mut profile_ids = Vec::new();
    for pname in profile_names {
        let profile = db
            .get_profile_by_name(workspace, pname)
            .ok_or_else(|| format!("Profile \"{}\" not found", pname))?;
        profile_ids.push(profile.id);
    }

    let now = chrono::Utc::now().to_rfc3339();
    let group = wayport_core::types::TunnelGroup {
        id: uuid::Uuid::new_v4().to_string(),
        workspace_id: workspace.to_string(),
        name: name.to_string(),
        profile_ids,
        sort_order: 0,
        created_at: now.clone(),
        updated_at: now,
    };

    db.create_group(&group)?;
    output::success(&format!(
        "Created group \"{}\" with {} profiles",
        name,
        profile_names.len()
    ));
    Ok(())
}

pub fn delete(workspace: &str, name: &str) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let group = db
        .get_group_by_name(workspace, name)
        .ok_or_else(|| format!("Group \"{}\" not found", name))?;
    db.delete_group(&group.id)?;
    output::success(&format!("Deleted group \"{}\"", name));
    Ok(())
}

pub fn connect(workspace: &str, name: &str) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let group = db
        .get_group_by_name(workspace, name)
        .ok_or_else(|| format!("Group \"{}\" not found", name))?;

    let mut started = 0;
    for profile_id in &group.profile_ids {
        if let Some(profile) = db.get_profile(profile_id) {
            // Skip if already connected
            if let Some((pid_val, _)) = pid::read_pid(&profile.id) {
                if pid::is_process_alive(pid_val) {
                    output::info(&format!(
                        "\"{}\" already connected (PID {})",
                        profile.name, pid_val
                    ));
                    continue;
                }
                pid::remove_pid(&profile.id);
            }

            let args = TunnelManager::build_ssh_args(&profile);
            match std::process::Command::new("ssh")
                .args(&args)
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .spawn()
            {
                Ok(child) => {
                    let child_pid = child.id();
                    pid::write_pid(&profile.id, child_pid, ActionSource::Cli)?;
                    history::record_action(
                        &db,
                        workspace,
                        Some(&profile.id),
                        &profile.name,
                        "connect",
                        ActionSource::Cli,
                        Some(format!("group:{}", group.name)),
                        None,
                    )
                    .ok();
                    output::success(&format!(
                        "Connected \"{}\" on port {} (PID {})",
                        profile.name, profile.local_port, child_pid
                    ));
                    started += 1;
                }
                Err(e) => {
                    eprintln!(
                        "\x1b[31merror:\x1b[0m Failed to start \"{}\": {}",
                        profile.name, e
                    );
                }
            }
        }
    }

    output::info(&format!(
        "{}/{} tunnels started in group \"{}\"",
        started,
        group.profile_ids.len(),
        name
    ));
    Ok(())
}

pub fn disconnect(workspace: &str, name: &str) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let group = db
        .get_group_by_name(workspace, name)
        .ok_or_else(|| format!("Group \"{}\" not found", name))?;

    let mut stopped = 0;
    for profile_id in &group.profile_ids {
        if let Some((pid_val, _)) = pid::read_pid(profile_id) {
            if pid::is_process_alive(pid_val) {
                pid::kill_process(pid_val);
                stopped += 1;
            }
            pid::remove_pid(profile_id);

            if let Some(profile) = db.get_profile(profile_id) {
                history::record_action(
                    &db,
                    workspace,
                    Some(profile_id),
                    &profile.name,
                    "disconnect",
                    ActionSource::Cli,
                    Some(format!("group:{}", name)),
                    None,
                )
                .ok();
            }
        }
    }

    output::success(&format!(
        "Disconnected {} tunnels in group \"{}\"",
        stopped, name
    ));
    Ok(())
}
