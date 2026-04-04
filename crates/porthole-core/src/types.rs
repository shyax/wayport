use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ForwardingType {
    Local,
    Remote,
    Dynamic,
}

impl Default for ForwardingType {
    fn default() -> Self {
        ForwardingType::Local
    }
}

fn default_true() -> bool {
    true
}

fn default_workspace_id() -> String {
    "local".to_string()
}

fn default_version() -> i32 {
    1
}

fn default_action_source() -> ActionSource {
    ActionSource::Gui
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ActionSource {
    Gui,
    Cli,
    Api,
}

impl std::fmt::Display for ActionSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ActionSource::Gui => write!(f, "gui"),
            ActionSource::Cli => write!(f, "cli"),
            ActionSource::Api => write!(f, "api"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionProfile {
    #[serde(default)]
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub forwarding_type: ForwardingType,
    pub ssh_user: String,
    pub bastion_host: String,
    pub bastion_port: u16,
    #[serde(default)]
    pub identity_file: String,
    pub local_port: u16,
    #[serde(default)]
    pub remote_host: Option<String>,
    #[serde(default)]
    pub remote_port: Option<u16>,
    #[serde(default = "default_true")]
    pub auto_reconnect: bool,
    #[serde(default)]
    pub jump_hosts: Vec<JumpHost>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
    #[serde(default = "default_workspace_id")]
    pub workspace_id: String,
    #[serde(default)]
    pub folder_id: Option<String>,
    #[serde(default)]
    pub sort_order: i32,
    #[serde(default = "default_version")]
    pub version: i32,
}

impl ConnectionProfile {
    /// Apply environment variable substitution to connection fields.
    /// Replaces `${VAR_NAME}` patterns with values from the provided map.
    pub fn with_env_vars(&self, vars: &HashMap<String, String>) -> Self {
        let sub = |s: &str| -> String {
            let mut result = s.to_string();
            for (key, value) in vars {
                result = result.replace(&format!("${{{}}}", key), value);
            }
            result
        };

        let mut profile = self.clone();
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JumpHost {
    pub host: String,
    pub port: u16,
    pub user: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TunnelStatus {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelState {
    pub profile_id: String,
    pub status: TunnelStatus,
    pub error: Option<String>,
    pub connected_since: Option<String>,
    pub reconnect_attempt: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortInfo {
    pub port: u16,
    pub pid: Option<u32>,
    pub process_name: Option<String>,
    pub state: String,
    pub local_addr: String,
    pub remote_addr: Option<String>,
    pub protocol: Option<String>,
}

// --- Store config (for JSON migration) ---

#[derive(Debug, Serialize, Deserialize)]
pub struct StoreConfig {
    pub profiles: Vec<ConnectionProfile>,
    pub window_bounds: Option<WindowBounds>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl Default for StoreConfig {
    fn default() -> Self {
        Self {
            profiles: Vec::new(),
            window_bounds: None,
        }
    }
}

// --- SQLite-backed types ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub workspace_type: String,
    pub is_local: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub workspace_id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Environment {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub variables: HashMap<String, String>,
    pub sort_order: i32,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub workspace_id: String,
    pub profile_id: Option<String>,
    pub profile_name: String,
    pub user_display_name: String,
    pub action: String,
    pub details: Option<String>,
    pub duration_secs: Option<i64>,
    pub created_at: String,
    #[serde(default = "default_action_source")]
    pub source: ActionSource,
}
