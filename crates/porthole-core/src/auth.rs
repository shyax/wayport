use crate::config::auth_path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuthState {
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub user_email: Option<String>,
    pub expires_at: Option<String>,
}

pub fn load_auth() -> Option<AuthState> {
    let path = auth_path();
    let content = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

pub fn save_auth(state: &AuthState) -> Result<(), String> {
    let json = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    std::fs::write(auth_path(), json).map_err(|e| e.to_string())
}

pub fn clear_auth() -> Result<(), String> {
    let path = auth_path();
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn is_authenticated() -> bool {
    load_auth()
        .and_then(|s| s.access_token)
        .map(|t| !t.is_empty())
        .unwrap_or(false)
}
