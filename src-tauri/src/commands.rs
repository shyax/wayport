use tauri::{State, AppHandle, Emitter};
use uuid::Uuid;
use chrono::Utc;
use crate::types::{ConnectionProfile, Environment, Folder, HistoryEntry, TunnelState, Workspace, ForwardingType};
use crate::store::Store;
use crate::tunnel_manager::TunnelManager;

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

    let mut profiles = store.get_profiles();
    profiles.push(profile.clone());
    store
        .save_profiles(profiles)
        .map_err(|e| e.to_string())?;

    Ok(profile)
}

#[tauri::command]
pub fn update_profile(
    profile: ConnectionProfile,
    store: State<Store>,
) -> Result<ConnectionProfile, String> {
    let mut profile = profile;
    profile.updated_at = Utc::now().to_rfc3339();

    let mut profiles = store.get_profiles();
    profiles = profiles
        .into_iter()
        .map(|p| if p.id == profile.id { profile.clone() } else { p })
        .collect();

    store
        .save_profiles(profiles)
        .map_err(|e| e.to_string())?;

    Ok(profile)
}

#[tauri::command]
pub fn delete_profile(id: String, store: State<Store>, tunnel_manager: State<TunnelManager>) -> Result<(), String> {
    tunnel_manager.stop_tunnel(&id);
    let profiles = store.get_profiles();
    let profiles = profiles
        .into_iter()
        .filter(|p| p.id != id)
        .collect();

    store
        .save_profiles(profiles)
        .map_err(|e| e.to_string())
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
    tunnel_manager.start_tunnel(profile, move |state| {
        let _ = app_clone.emit("tunnel-state-update", &state);
    });

    Ok(())
}

fn apply_env_vars(mut profile: ConnectionProfile, vars: &std::collections::HashMap<String, String>) -> ConnectionProfile {
    let sub = |s: &str| -> String {
        let mut result = s.to_string();
        for (key, value) in vars {
            result = result.replace(&format!("${{{}}}", key), value);
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
pub fn stop_tunnel(profile_id: String, tunnel_manager: State<TunnelManager>) -> Result<(), String> {
    tunnel_manager.stop_tunnel(&profile_id);
    Ok(())
}

#[tauri::command]
pub fn stop_all_tunnels(tunnel_manager: State<TunnelManager>) -> Result<(), String> {
    tunnel_manager.stop_all_tunnels();
    Ok(())
}

#[tauri::command]
pub fn get_tunnel_states(tunnel_manager: State<TunnelManager>) -> std::collections::HashMap<String, TunnelState> {
    tunnel_manager.get_states()
}

#[tauri::command]
pub fn get_tunnel_logs(profile_id: String, tunnel_manager: State<TunnelManager>) -> Vec<String> {
    tunnel_manager.get_logs(&profile_id)
}

#[tauri::command]
pub fn check_ssh() -> Result<std::collections::HashMap<String, String>, String> {
    match std::process::Command::new("ssh")
        .arg("-V")
        .output()
    {
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
pub async fn export_profiles(store: State<'_, Store>) -> Result<String, String> {
    let profiles = store.get_profiles();
    let export_data = serde_json::json!({
        "version": 1,
        "exported_at": Utc::now().to_rfc3339(),
        "profiles": profiles
    });

    // Save to Downloads folder with timestamp
    let downloads = dirs::download_dir().ok_or("Could not find Downloads folder")?;
    let filename = format!("porthole-config-{}.json", chrono::Local::now().format("%Y%m%d-%H%M%S"));
    let path = downloads.join(filename);

    std::fs::write(&path, export_data.to_string())
        .map_err(|e| e.to_string())?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_profiles(store: State<'_, Store>) -> Result<u32, String> {
    // For now, we'll look for porthole-config.json in the Downloads folder
    let downloads = dirs::download_dir().ok_or("Could not find Downloads folder")?;
    let path = downloads.join("porthole-config.json");

    if !path.exists() {
        return Err("No porthole-config.json found in Downloads folder".to_string());
    }

    let content = std::fs::read_to_string(&path)
        .map_err(|e| e.to_string())?;

    let import_data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| e.to_string())?;

    let imported_profiles: Vec<ConnectionProfile> = serde_json::from_value(
        import_data["profiles"].clone()
    ).map_err(|e| e.to_string())?;

    let mut profiles = store.get_profiles();
    let mut imported_count = 0;

    for imported in imported_profiles {
        if !profiles.iter().any(|p| p.id == imported.id) {
            profiles.push(imported);
            imported_count += 1;
        }
    }

    store
        .save_profiles(profiles)
        .map_err(|e| e.to_string())?;

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
pub fn create_environment(environment: Environment, store: State<Store>) -> Result<Environment, String> {
    let mut env = environment;
    env.id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    env.created_at = now.clone();
    env.updated_at = now;
    store.database().create_environment(&env)?;
    Ok(env)
}

#[tauri::command]
pub fn update_environment(environment: Environment, store: State<Store>) -> Result<Environment, String> {
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
pub fn get_history(workspace_id: String, limit: Option<u32>, store: State<Store>) -> Vec<HistoryEntry> {
    store.database().get_history(&workspace_id, limit.unwrap_or(100))
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

    let flush = |host: &str, user: &str, hostname: &str, port: u16, identity: &str| -> Option<ConnectionProfile> {
        if host.is_empty() || host == "*" || hostname.is_empty() {
            return None;
        }
        Some(ConnectionProfile {
            id: String::new(),
            name: host.to_string(),
            forwarding_type: ForwardingType::Local,
            ssh_user: if user.is_empty() { "root".to_string() } else { user.to_string() },
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
            version: 1,
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
                    if let Some(profile) = flush(host, &current_user, &current_hostname, current_port, &current_identity) {
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
            "identityfile" => current_identity = value.replace("~", &dirs::home_dir().map(|h| h.to_string_lossy().to_string()).unwrap_or_default()),
            _ => {}
        }
    }

    // Flush last host
    if let Some(ref host) = current_host {
        if let Some(profile) = flush(host, &current_user, &current_hostname, current_port, &current_identity) {
            profiles.push(profile);
        }
    }

    Ok(profiles)
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
