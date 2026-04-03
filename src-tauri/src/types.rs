use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionProfile {
    pub id: String,
    pub name: String,
    pub ssh_user: String,
    pub bastion_host: String,
    pub bastion_port: u16,
    pub identity_file: String,
    pub local_port: u16,
    pub remote_host: String,
    pub remote_port: u16,
    pub auto_reconnect: bool,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
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
