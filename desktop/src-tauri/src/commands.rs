use crate::store::Store;
use crate::tunnel_manager::TunnelManager;
use crate::types::{
    ConnectionProfile, Environment, Folder, ForwardingType, HistoryEntry, TunnelGroup, TunnelState,
    TunnelStatus, Workspace,
};
use chrono::Utc;
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

/// Send a desktop notification if the user has notifications enabled.
fn send_notification(app: &AppHandle, title: &str, body: &str) {
    // Check user preference (default: enabled)
    let enabled = app
        .state::<Store>()
        .database()
        .get_preference("notifications_enabled")
        .map(|v| v != "false")
        .unwrap_or(true);

    if !enabled {
        return;
    }

    use tauri_plugin_notification::NotificationExt;
    let _ = app.notification().builder().title(title).body(body).show();
}

/// Update the system tray tooltip with the current active tunnel count.
pub fn update_tray_tooltip(app: &AppHandle) {
    let tm = app.state::<TunnelManager>();
    let states = tm.get_states();

    let mut active = states
        .values()
        .filter(|s| s.status == TunnelStatus::Connected)
        .count();

    // Count CLI-started tunnels not already tracked by the GUI
    for (profile_id, pid, _source, _connected_since) in wayport_core::pid::list_active_tunnels() {
        if !states.contains_key(&profile_id) && wayport_core::pid::is_process_alive(pid) {
            active += 1;
        }
    }

    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = match active {
            0 => "Wayport — No active tunnels".to_string(),
            1 => "Wayport — 1 active tunnel".to_string(),
            n => format!("Wayport — {} active tunnels", n),
        };
        let _ = tray.set_tooltip(Some(&tooltip));
    }
}

#[tauri::command]
pub fn list_profiles(store: State<Store>) -> Vec<ConnectionProfile> {
    store.get_profiles()
}

#[tauri::command]
pub fn create_profile(
    profile: ConnectionProfile,
    store: State<Store>,
) -> Result<ConnectionProfile, String> {
    let mut profile = profile;
    profile.id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    profile.created_at = now.clone();
    profile.updated_at = now;

    store.database().create_profile(&profile)?;

    Ok(profile)
}

#[tauri::command]
pub fn update_profile(
    profile: ConnectionProfile,
    store: State<Store>,
) -> Result<ConnectionProfile, String> {
    let mut profile = profile;
    profile.updated_at = Utc::now().to_rfc3339();

    store.database().update_profile(&profile)?;

    Ok(profile)
}

#[tauri::command]
pub fn delete_profile(
    id: String,
    store: State<Store>,
    tunnel_manager: State<TunnelManager>,
) -> Result<(), String> {
    tunnel_manager.stop_tunnel(&id);
    let profiles = store.get_profiles();
    let profiles = profiles.into_iter().filter(|p| p.id != id).collect();

    store.save_profiles(profiles).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pin_profile(profile_id: String, store: State<Store>) -> Result<(), String> {
    store.database().set_profile_pinned(&profile_id, true)
}

#[tauri::command]
pub fn unpin_profile(profile_id: String, store: State<Store>) -> Result<(), String> {
    store.database().set_profile_pinned(&profile_id, false)
}

#[tauri::command]
pub fn get_recent_profiles(
    workspace_id: String,
    limit: usize,
    store: State<Store>,
) -> Result<Vec<String>, String> {
    Ok(store
        .database()
        .get_recent_profile_ids(&workspace_id, limit))
}

#[tauri::command]
pub fn start_tunnel(
    profile_id: String,
    env_vars: Option<std::collections::HashMap<String, String>>,
    store: State<Store>,
    tunnel_manager: State<TunnelManager>,
    app: AppHandle,
) -> Result<(), String> {
    let profiles = store.get_profiles();
    let profile = profiles
        .into_iter()
        .find(|p| p.id == profile_id)
        .ok_or("Profile not found")?;

    // Apply environment variable substitution
    let profile = if let Some(vars) = env_vars {
        apply_env_vars(profile, &vars)
    } else {
        profile
    };

    let app_clone = app.clone();
    let profile_name = profile.name.clone();
    let local_port = profile.local_port;
    tunnel_manager.start_tunnel(profile, move |state| {
        let _ = app_clone.emit("tunnel-state-update", &state);
        update_tray_tooltip(&app_clone);

        match state.status {
            TunnelStatus::Connected => {
                send_notification(
                    &app_clone,
                    "Tunnel Connected",
                    &format!("{} on port {}", profile_name, local_port),
                );
            }
            TunnelStatus::Error => {
                let msg = state.error.as_deref().unwrap_or("Unknown error");
                send_notification(
                    &app_clone,
                    "Tunnel Failed",
                    &format!("{}: {}", profile_name, msg),
                );
            }
            TunnelStatus::Reconnecting => {
                send_notification(
                    &app_clone,
                    "Tunnel Reconnecting",
                    &format!("{} — attempt {}", profile_name, state.reconnect_attempt),
                );
            }
            _ => {}
        }
    });

    Ok(())
}

fn apply_env_vars(
    mut profile: ConnectionProfile,
    vars: &std::collections::HashMap<String, String>,
) -> ConnectionProfile {
    let sub = |s: &str| -> String {
        let mut result = s.to_string();
        for (key, value) in vars {
            result = result.replace(&format!("{{{{{}}}}}", key), value);
        }
        result
    };

    profile.bastion_host = sub(&profile.bastion_host);
    profile.ssh_user = sub(&profile.ssh_user);
    profile.identity_file = sub(&profile.identity_file);
    if let Some(ref host) = profile.remote_host {
        profile.remote_host = Some(sub(host));
    }
    for jh in &mut profile.jump_hosts {
        jh.host = sub(&jh.host);
        jh.user = sub(&jh.user);
    }
    profile
}

#[tauri::command]
pub fn stop_tunnel(
    profile_id: String,
    tunnel_manager: State<TunnelManager>,
    app: AppHandle,
) -> Result<(), String> {
    tunnel_manager.stop_tunnel(&profile_id);
    let _ = app.emit(
        "tunnel-state-update",
        crate::types::TunnelState {
            profile_id,
            status: crate::types::TunnelStatus::Disconnected,
            error: None,
            connected_since: None,
            reconnect_attempt: 0,
        },
    );
    update_tray_tooltip(&app);
    Ok(())
}

#[tauri::command]
pub fn stop_all_tunnels(
    tunnel_manager: State<TunnelManager>,
    app: AppHandle,
) -> Result<(), String> {
    tunnel_manager.stop_all_tunnels();
    update_tray_tooltip(&app);
    Ok(())
}

#[tauri::command]
pub fn get_tunnel_states(
    tunnel_manager: State<TunnelManager>,
    app: AppHandle,
) -> std::collections::HashMap<String, TunnelState> {
    let mut states = tunnel_manager.get_states();

    // Merge in CLI-started tunnels from PID files
    for (profile_id, _pid, _source, _connected_since) in wayport_core::pid::list_active_tunnels() {
        if !states.contains_key(&profile_id) {
            states.insert(
                profile_id.clone(),
                crate::types::TunnelState {
                    profile_id,
                    status: crate::types::TunnelStatus::Connected,
                    error: None,
                    connected_since: None,
                    reconnect_attempt: 0,
                },
            );
        }
    }

    // Remove stale entries for tunnels whose PID files no longer exist
    states.retain(|id, state| {
        if state.status == crate::types::TunnelStatus::Connected {
            // If it's connected but not in our tunnel manager, verify PID still alive
            if !tunnel_manager.has_tunnel(id) {
                return wayport_core::pid::read_pid(id)
                    .map(|(pid, _)| wayport_core::pid::is_process_alive(pid))
                    .unwrap_or(false);
            }
        }
        true
    });

    // Keep tray tooltip in sync on every poll
    let active = states
        .values()
        .filter(|s| s.status == TunnelStatus::Connected)
        .count();
    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = match active {
            0 => "Wayport — No active tunnels".to_string(),
            1 => "Wayport — 1 active tunnel".to_string(),
            n => format!("Wayport — {} active tunnels", n),
        };
        let _ = tray.set_tooltip(Some(&tooltip));
    }

    states
}

#[tauri::command]
pub fn get_tunnel_logs(profile_id: String, tunnel_manager: State<TunnelManager>) -> Vec<String> {
    tunnel_manager.get_logs(&profile_id)
}

#[tauri::command]
pub fn get_tunnel_stats(tunnel_manager: State<TunnelManager>) -> Vec<crate::types::TunnelStats> {
    tunnel_manager.get_stats()
}

#[tauri::command]
pub fn check_ssh() -> Result<std::collections::HashMap<String, String>, String> {
    match std::process::Command::new("ssh").arg("-V").output() {
        Ok(output) => {
            let version = String::from_utf8_lossy(&output.stderr).to_string();
            let mut result = std::collections::HashMap::new();
            result.insert("available".to_string(), "true".to_string());
            result.insert("version".to_string(), version);
            Ok(result)
        }
        Err(_) => {
            let mut result = std::collections::HashMap::new();
            result.insert("available".to_string(), "false".to_string());
            result.insert("version".to_string(), "".to_string());
            Ok(result)
        }
    }
}

#[tauri::command]
pub async fn export_profiles(
    store: State<'_, Store>,
    format: Option<String>,
) -> Result<String, String> {
    use wayport_core::config_file::{self, ConfigFormat};

    let desktop_profiles = store.get_profiles();

    // Convert desktop ConnectionProfile to core ConnectionProfile via JSON round-trip.
    // Both types have identical serde representations, so this is always lossless.
    let core_profiles: Vec<wayport_core::types::ConnectionProfile> = {
        let json = serde_json::to_string(&desktop_profiles).map_err(|e| e.to_string())?;
        serde_json::from_str(&json).map_err(|e| e.to_string())?
    };

    let cfg_format = match format.as_deref().unwrap_or("json").to_lowercase().as_str() {
        "yaml" | "yml" => ConfigFormat::Yaml,
        "toml" => ConfigFormat::Toml,
        _ => ConfigFormat::Json,
    };

    // Save to Downloads folder with timestamp
    let downloads = dirs::download_dir().ok_or("Could not find Downloads folder")?;
    let filename = format!(
        "wayport-config-{}.{}",
        chrono::Local::now().format("%Y%m%d-%H%M%S"),
        cfg_format.extension()
    );
    let path = downloads.join(filename);

    config_file::save_to_file(&core_profiles, &path, cfg_format)?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_profiles(store: State<'_, Store>) -> Result<u32, String> {
    // For now, we'll look for wayport-config.json in the Downloads folder
    let downloads = dirs::download_dir().ok_or("Could not find Downloads folder")?;
    let path = downloads.join("wayport-config.json");

    if !path.exists() {
        return Err("No wayport-config.json found in Downloads folder".to_string());
    }

    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;

    let import_data: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let imported_profiles: Vec<ConnectionProfile> =
        serde_json::from_value(import_data["profiles"].clone()).map_err(|e| e.to_string())?;

    let mut profiles = store.get_profiles();
    let mut imported_count = 0;

    for imported in imported_profiles {
        if !profiles.iter().any(|p| p.id == imported.id) {
            profiles.push(imported);
            imported_count += 1;
        }
    }

    store.save_profiles(profiles).map_err(|e| e.to_string())?;

    Ok(imported_count)
}

// ---------------------------------------------------------------------------
// Workspace commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_workspaces(store: State<Store>) -> Vec<Workspace> {
    store.database().get_workspaces()
}

// ---------------------------------------------------------------------------
// Folder commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_folders(workspace_id: String, store: State<Store>) -> Vec<Folder> {
    store.database().get_folders(&workspace_id)
}

#[tauri::command]
pub fn create_folder(folder: Folder, store: State<Store>) -> Result<Folder, String> {
    let mut folder = folder;
    folder.id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    folder.created_at = now.clone();
    folder.updated_at = now;
    store.database().create_folder(&folder)?;
    Ok(folder)
}

#[tauri::command]
pub fn update_folder(folder: Folder, store: State<Store>) -> Result<Folder, String> {
    let mut folder = folder;
    folder.updated_at = Utc::now().to_rfc3339();
    store.database().update_folder(&folder)?;
    Ok(folder)
}

#[tauri::command]
pub fn delete_folder(id: String, store: State<Store>) -> Result<(), String> {
    store.database().delete_folder(&id)
}

// ---------------------------------------------------------------------------
// Environment commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_environments(workspace_id: String, store: State<Store>) -> Vec<Environment> {
    store.database().get_environments(&workspace_id)
}

#[tauri::command]
pub fn create_environment(
    environment: Environment,
    store: State<Store>,
) -> Result<Environment, String> {
    let mut env = environment;
    env.id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    env.created_at = now.clone();
    env.updated_at = now;
    store.database().create_environment(&env)?;
    Ok(env)
}

#[tauri::command]
pub fn update_environment(
    environment: Environment,
    store: State<Store>,
) -> Result<Environment, String> {
    let mut env = environment;
    env.updated_at = Utc::now().to_rfc3339();
    store.database().update_environment(&env)?;
    Ok(env)
}

#[tauri::command]
pub fn delete_environment(id: String, store: State<Store>) -> Result<(), String> {
    store.database().delete_environment(&id)
}

// ---------------------------------------------------------------------------
// History commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_history(
    workspace_id: String,
    limit: Option<u32>,
    store: State<Store>,
) -> Vec<HistoryEntry> {
    store
        .database()
        .get_history(&workspace_id, limit.unwrap_or(100))
}

#[tauri::command]
pub fn record_connection_event(entry: HistoryEntry, store: State<Store>) -> Result<(), String> {
    let mut entry = entry;
    if entry.id.is_empty() {
        entry.id = Uuid::new_v4().to_string();
    }
    if entry.created_at.is_empty() {
        entry.created_at = Utc::now().to_rfc3339();
    }
    store.database().record_history(&entry)
}

// ---------------------------------------------------------------------------
// Preference commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_preference(key: String, store: State<Store>) -> Option<String> {
    store.database().get_preference(&key)
}

#[tauri::command]
pub fn set_preference(key: String, value: String, store: State<Store>) -> Result<(), String> {
    store.database().set_preference(&key, &value)
}

// ---------------------------------------------------------------------------
// Tunnel Group commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_groups(workspace_id: String, store: State<Store>) -> Vec<TunnelGroup> {
    store.database().get_groups(&workspace_id)
}

#[tauri::command]
pub fn create_group(group: TunnelGroup, store: State<Store>) -> Result<TunnelGroup, String> {
    let mut group = group;
    group.id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    group.created_at = now.clone();
    group.updated_at = now;
    store.database().create_group(&group)?;
    Ok(group)
}

#[tauri::command]
pub fn update_group(group: TunnelGroup, store: State<Store>) -> Result<TunnelGroup, String> {
    let mut group = group;
    group.updated_at = Utc::now().to_rfc3339();
    store.database().update_group(&group)?;
    Ok(group)
}

#[tauri::command]
pub fn delete_group(id: String, store: State<Store>) -> Result<(), String> {
    store.database().delete_group(&id)
}

#[tauri::command]
pub fn start_group(
    group_id: String,
    env_vars: Option<std::collections::HashMap<String, String>>,
    store: State<Store>,
    tunnel_manager: State<TunnelManager>,
    app: AppHandle,
) -> Result<(), String> {
    let groups = store.database().get_groups("local");
    let group = groups
        .into_iter()
        .find(|g| g.id == group_id)
        .ok_or("Group not found")?;

    let profiles = store.get_profiles();

    for pid in &group.profile_ids {
        if let Some(profile) = profiles.iter().find(|p| p.id == *pid) {
            let profile = if let Some(ref vars) = env_vars {
                apply_env_vars(profile.clone(), vars)
            } else {
                profile.clone()
            };

            let app_clone = app.clone();
            let profile_name = profile.name.clone();
            let local_port = profile.local_port;
            tunnel_manager.start_tunnel(profile, move |state| {
                let _ = app_clone.emit("tunnel-state-update", &state);
                update_tray_tooltip(&app_clone);

                match state.status {
                    TunnelStatus::Connected => {
                        send_notification(
                            &app_clone,
                            "Tunnel Connected",
                            &format!("{} on port {}", profile_name, local_port),
                        );
                    }
                    TunnelStatus::Error => {
                        let msg = state.error.as_deref().unwrap_or("Unknown error");
                        send_notification(
                            &app_clone,
                            "Tunnel Failed",
                            &format!("{}: {}", profile_name, msg),
                        );
                    }
                    _ => {}
                }
            });
        }
    }

    Ok(())
}

#[tauri::command]
pub fn stop_group(
    group_id: String,
    store: State<Store>,
    tunnel_manager: State<TunnelManager>,
    app: AppHandle,
) -> Result<(), String> {
    let groups = store.database().get_groups("local");
    let group = groups
        .into_iter()
        .find(|g| g.id == group_id)
        .ok_or("Group not found")?;

    for pid in &group.profile_ids {
        tunnel_manager.stop_tunnel(pid);
        let _ = app.emit(
            "tunnel-state-update",
            crate::types::TunnelState {
                profile_id: pid.to_string(),
                status: crate::types::TunnelStatus::Disconnected,
                error: None,
                connected_since: None,
                reconnect_attempt: 0,
            },
        );
    }
    update_tray_tooltip(&app);
    Ok(())
}

// ---------------------------------------------------------------------------
// Autostart (launch at login)
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_autostart_enabled(enabled: bool, app: AppHandle) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let autolaunch = app.autolaunch();
    if enabled {
        autolaunch.enable().map_err(|e| e.to_string())
    } else {
        autolaunch.disable().map_err(|e| e.to_string())
    }
}

// ---------------------------------------------------------------------------
// SSH Key Management
// ---------------------------------------------------------------------------

#[derive(serde::Serialize)]
pub struct SshKeyInfo {
    pub name: String,
    pub path: String,
    pub key_type: String,
    pub has_public: bool,
}

#[tauri::command]
pub fn list_ssh_keys() -> Vec<SshKeyInfo> {
    let ssh_dir = match dirs::home_dir() {
        Some(home) => home.join(".ssh"),
        None => return vec![],
    };

    if !ssh_dir.exists() {
        return vec![];
    }

    let mut keys = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&ssh_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            let name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            // Skip public keys, config files, known_hosts, etc.
            if name.ends_with(".pub")
                || name == "config"
                || name == "known_hosts"
                || name == "known_hosts.old"
                || name == "authorized_keys"
                || name.starts_with('.')
            {
                continue;
            }

            // Check if it looks like a private key by reading first line
            if let Ok(content) = std::fs::read_to_string(&path) {
                if !content.starts_with("-----BEGIN") {
                    continue;
                }

                let key_type = if content.contains("RSA") {
                    "RSA"
                } else if content.contains("EC") {
                    "ECDSA"
                } else if content.contains("OPENSSH") {
                    "ED25519"
                } else {
                    "Unknown"
                };

                let pub_path = path.with_extension(format!(
                    "{}.pub",
                    path.extension()
                        .map(|e| e.to_string_lossy().to_string())
                        .unwrap_or_default()
                ));
                // Also check for name.pub
                let pub_exists =
                    pub_path.exists() || ssh_dir.join(format!("{}.pub", name)).exists();

                keys.push(SshKeyInfo {
                    name,
                    path: path.to_string_lossy().to_string(),
                    key_type: key_type.to_string(),
                    has_public: pub_exists,
                });
            }
        }
    }

    keys.sort_by(|a, b| a.name.cmp(&b.name));
    keys
}

#[tauri::command]
pub fn get_public_key(name: String) -> Result<String, String> {
    let ssh_dir = dirs::home_dir()
        .ok_or("Cannot find home directory")?
        .join(".ssh");
    let pub_path = ssh_dir.join(format!("{}.pub", name));

    if !pub_path.exists() {
        return Err(format!("Public key not found: {}.pub", name));
    }

    std::fs::read_to_string(&pub_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_ssh_key(name: String, key_type: String) -> Result<String, String> {
    let ssh_dir = dirs::home_dir()
        .ok_or("Cannot find home directory")?
        .join(".ssh");
    std::fs::create_dir_all(&ssh_dir).map_err(|e| e.to_string())?;

    let key_path = ssh_dir.join(&name);
    if key_path.exists() {
        return Err(format!("Key '{}' already exists", name));
    }

    let kt = match key_type.as_str() {
        "rsa" => "rsa",
        "ecdsa" => "ecdsa",
        _ => "ed25519",
    };

    let output = std::process::Command::new("ssh-keygen")
        .args(["-t", kt, "-f", &key_path.to_string_lossy(), "-N", "", "-q"])
        .output()
        .map_err(|e| format!("Failed to run ssh-keygen: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ssh-keygen failed: {}", stderr));
    }

    Ok(key_path.to_string_lossy().to_string())
}

// ---------------------------------------------------------------------------
// SSH config import
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn import_ssh_config() -> Result<Vec<ConnectionProfile>, String> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let config_path = home.join(".ssh").join("config");

    if !config_path.exists() {
        return Err("No ~/.ssh/config file found".to_string());
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read SSH config: {}", e))?;

    let mut profiles = Vec::new();
    let mut current_host: Option<String> = None;
    let mut current_user = String::new();
    let mut current_hostname = String::new();
    let mut current_port: u16 = 22;
    let mut current_identity = String::new();

    let flush = |host: &str,
                 user: &str,
                 hostname: &str,
                 port: u16,
                 identity: &str|
     -> Option<ConnectionProfile> {
        if host.is_empty() || host == "*" || hostname.is_empty() {
            return None;
        }
        Some(ConnectionProfile {
            id: String::new(),
            name: host.to_string(),
            forwarding_type: ForwardingType::Local,
            ssh_user: if user.is_empty() {
                "root".to_string()
            } else {
                user.to_string()
            },
            bastion_host: hostname.to_string(),
            bastion_port: port,
            identity_file: identity.to_string(),
            local_port: 0,
            remote_host: None,
            remote_port: None,
            auto_reconnect: true,
            jump_hosts: Vec::new(),
            tags: vec!["ssh-import".to_string()],
            created_at: String::new(),
            updated_at: String::new(),
            workspace_id: "local".to_string(),
            folder_id: None,
            sort_order: 0,
            is_pinned: false,
            version: 1,
            k8s_context: None,
            k8s_namespace: None,
            k8s_resource: None,
            k8s_resource_port: None,
        })
    };

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let parts: Vec<&str> = line.splitn(2, char::is_whitespace).collect();
        if parts.len() < 2 {
            continue;
        }

        let key = parts[0].to_lowercase();
        let value = parts[1].trim().to_string();

        match key.as_str() {
            "host" => {
                // Flush previous host
                if let Some(ref host) = current_host {
                    if let Some(profile) = flush(
                        host,
                        &current_user,
                        &current_hostname,
                        current_port,
                        &current_identity,
                    ) {
                        profiles.push(profile);
                    }
                }
                current_host = Some(value);
                current_user = String::new();
                current_hostname = String::new();
                current_port = 22;
                current_identity = String::new();
            }
            "hostname" => current_hostname = value,
            "user" => current_user = value,
            "port" => current_port = value.parse().unwrap_or(22),
            "identityfile" => {
                current_identity = value.replace(
                    "~",
                    &dirs::home_dir()
                        .map(|h| h.to_string_lossy().to_string())
                        .unwrap_or_default(),
                )
            }
            _ => {}
        }
    }

    // Flush last host
    if let Some(ref host) = current_host {
        if let Some(profile) = flush(
            host,
            &current_user,
            &current_hostname,
            current_port,
            &current_identity,
        ) {
            profiles.push(profile);
        }
    }

    Ok(profiles)
}

// ---------------------------------------------------------------------------
// Open terminal
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn open_terminal(
    profile_id: String,
    env_vars: Option<std::collections::HashMap<String, String>>,
    store: State<'_, Store>,
) -> Result<(), String> {
    let profiles = store.get_profiles();
    let profile = profiles
        .into_iter()
        .find(|p| p.id == profile_id)
        .ok_or("Profile not found")?;

    let profile = if let Some(vars) = env_vars {
        apply_env_vars(profile, &vars)
    } else {
        profile
    };

    let mut ssh_args = Vec::new();
    if !profile.identity_file.is_empty() {
        ssh_args.push("-i".to_string());
        ssh_args.push(profile.identity_file.clone());
    }
    if !profile.jump_hosts.is_empty() {
        let jumps: Vec<String> = profile
            .jump_hosts
            .iter()
            .map(|jh| format!("{}@{}:{}", jh.user, jh.host, jh.port))
            .collect();
        ssh_args.push("-J".to_string());
        ssh_args.push(jumps.join(","));
    }
    ssh_args.push("-p".to_string());
    ssh_args.push(profile.bastion_port.to_string());
    ssh_args.push(format!("{}@{}", profile.ssh_user, profile.bastion_host));

    let ssh_cmd = format!("ssh {}", ssh_args.join(" "));

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("osascript")
            .args([
                "-e",
                &format!("tell application \"Terminal\" to do script \"{}\"", ssh_cmd),
            ])
            .args(["-e", "tell application \"Terminal\" to activate"])
            .spawn()
            .map_err(|e| format!("Failed to open Terminal: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "cmd", "/k", &ssh_cmd])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        // Try common terminal emulators in order of preference
        let terminals = ["gnome-terminal", "konsole", "xfce4-terminal", "xterm"];
        let mut launched = false;
        for term in &terminals {
            let result = match *term {
                "gnome-terminal" => std::process::Command::new(term)
                    .args(["--", "bash", "-c", &format!("{};exec bash", ssh_cmd)])
                    .spawn(),
                "konsole" => std::process::Command::new(term)
                    .args(["-e", "bash", "-c", &format!("{};exec bash", ssh_cmd)])
                    .spawn(),
                _ => std::process::Command::new(term)
                    .args(["-e", &ssh_cmd])
                    .spawn(),
            };
            if result.is_ok() {
                launched = true;
                break;
            }
        }
        if !launched {
            return Err("No supported terminal emulator found".to_string());
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Port conflict check
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn find_next_available_port(start_port: u16) -> Result<u16, String> {
    for port in start_port..=65535 {
        if std::net::TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return Ok(port);
        }
    }
    Err("No available ports found".to_string())
}

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

#[derive(serde::Serialize)]
pub struct TestConnectionResult {
    pub success: bool,
    pub message: String,
    pub latency_ms: u64,
}

#[tauri::command]
pub async fn test_connection(
    profile: ConnectionProfile,
    env_vars: Option<std::collections::HashMap<String, String>>,
) -> Result<TestConnectionResult, String> {
    let profile = if let Some(vars) = env_vars {
        apply_env_vars(profile, &vars)
    } else {
        profile
    };

    let mut args: Vec<String> = Vec::new();

    if !profile.identity_file.is_empty() {
        args.push("-i".into());
        args.push(profile.identity_file.clone());
    }

    if !profile.jump_hosts.is_empty() {
        let jumps: Vec<String> = profile
            .jump_hosts
            .iter()
            .map(|jh| format!("{}@{}:{}", jh.user, jh.host, jh.port))
            .collect();
        args.push("-J".into());
        args.push(jumps.join(","));
    }

    args.extend([
        "-o".into(),
        "ConnectTimeout=10".into(),
        "-o".into(),
        "BatchMode=yes".into(),
        "-o".into(),
        "StrictHostKeyChecking=accept-new".into(),
        "-p".into(),
        profile.bastion_port.to_string(),
        format!("{}@{}", profile.ssh_user, profile.bastion_host),
        "exit".into(),
    ]);

    let start = std::time::Instant::now();

    match std::process::Command::new("ssh")
        .args(&args)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .output()
    {
        Ok(output) => {
            let latency_ms = start.elapsed().as_millis() as u64;
            if output.status.success() {
                Ok(TestConnectionResult {
                    success: true,
                    message: format!("Connected in {}ms", latency_ms),
                    latency_ms,
                })
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let msg = stderr
                    .lines()
                    .last()
                    .unwrap_or("Connection failed")
                    .to_string();
                Ok(TestConnectionResult {
                    success: false,
                    message: msg,
                    latency_ms,
                })
            }
        }
        Err(e) => Err(format!("Failed to run SSH: {}", e)),
    }
}

// ---------------------------------------------------------------------------
// Auth token persistence (cloud sync SSO)
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn load_auth_tokens() -> Option<wayport_core::auth::AuthTokens> {
    wayport_core::auth::load_tokens()
}

#[tauri::command]
pub fn save_auth_tokens(tokens: wayport_core::auth::AuthTokens) -> Result<(), String> {
    wayport_core::auth::save_tokens(&tokens)
}

#[tauri::command]
pub fn clear_auth_tokens() -> Result<(), String> {
    wayport_core::auth::clear_tokens()
}
