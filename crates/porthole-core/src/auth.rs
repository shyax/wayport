use crate::config::config_dir;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

fn auth_path() -> PathBuf {
    config_dir().join("auth.json")
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuthTokens {
    pub access_token: Option<String>,
    pub id_token: Option<String>,
    pub refresh_token: Option<String>,
    pub email: Option<String>,
    pub expires_at: Option<i64>, // epoch ms
}

pub fn load_tokens() -> Option<AuthTokens> {
    let path = auth_path();
    let content = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

pub fn save_tokens(tokens: &AuthTokens) -> Result<(), String> {
    let json = serde_json::to_string_pretty(tokens).map_err(|e| e.to_string())?;
    std::fs::write(auth_path(), json).map_err(|e| e.to_string())
}

pub fn clear_tokens() -> Result<(), String> {
    let path = auth_path();
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn is_authenticated() -> bool {
    load_tokens()
        .and_then(|t| t.access_token)
        .map(|t| !t.is_empty())
        .unwrap_or(false)
}
