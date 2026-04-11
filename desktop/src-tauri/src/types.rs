use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ForwardingType {
    Local,
    Remote,
    Dynamic,
    Kubernetes,
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
    #[serde(default)]
    pub is_pinned: bool,
    #[serde(default = "default_version")]
    pub version: i32,
    // Kubernetes port-forward fields
    #[serde(default)]
    pub k8s_context: Option<String>,
    #[serde(default)]
    pub k8s_namespace: Option<String>,
    #[serde(default)]
    pub k8s_resource: Option<String>,
    #[serde(default)]
    pub k8s_resource_port: Option<u16>,
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
pub struct TunnelStats {
    pub profile_id: String,
    pub local_port: u16,
    pub active_connections: u32,
    pub total_connections: u64,
    pub uptime_secs: u64,
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

// --- New types for SQLite-backed features ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub workspace_type: String, // "personal" or "team"
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
    pub variables: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub color: Option<String>,
    pub sort_order: i32,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelGroup {
    #[serde(default)]
    pub id: String,
    #[serde(default = "default_workspace_id")]
    pub workspace_id: String,
    pub name: String,
    #[serde(default)]
    pub profile_ids: Vec<String>,
    #[serde(default)]
    pub sort_order: i32,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub workspace_id: String,
    pub profile_id: Option<String>,
    pub profile_name: String,
    pub user_display_name: String,
    pub action: String, // "connect", "disconnect", "error", "reconnect"
    pub details: Option<String>,
    pub duration_secs: Option<i64>,
    pub created_at: String,
}
