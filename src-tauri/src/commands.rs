use tauri::{State, AppHandle, Window, Emitter};
use uuid::Uuid;
use chrono::Utc;
use crate::types::{ConnectionProfile, TunnelState};
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
    store: State<Store>,
    tunnel_manager: State<TunnelManager>,
    app: AppHandle,
) -> Result<(), String> {
    let profiles = store.get_profiles();
    let profile = profiles
        .into_iter()
        .find(|p| p.id == profile_id)
        .ok_or("Profile not found")?;

    let app_clone = app.clone();
    tunnel_manager.start_tunnel(profile, move |state| {
        let _ = app_clone.emit("tunnel-state-update", &state);
    });

    Ok(())
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
pub async fn select_key_file(_window: Window) -> Result<String, String> {
    // Simple file picker using native OS dialog
    // For now, return an error prompting user to implement file picker
    Err("File picker not yet implemented. Please type the path manually.".to_string())
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
    let filename = format!("port-forwarder-config-{}.json", chrono::Local::now().format("%Y%m%d-%H%M%S"));
    let path = downloads.join(filename);

    std::fs::write(&path, export_data.to_string())
        .map_err(|e| e.to_string())?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_profiles(store: State<'_, Store>) -> Result<u32, String> {
    // For now, we'll look for port-forwarder-config.json in the Downloads folder
    let downloads = dirs::download_dir().ok_or("Could not find Downloads folder")?;
    let path = downloads.join("port-forwarder-config.json");

    if !path.exists() {
        return Err("No port-forwarder-config.json found in Downloads folder".to_string());
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
