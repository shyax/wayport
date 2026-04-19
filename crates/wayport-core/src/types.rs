use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "lowercase")]
pub enum ForwardingType {
    #[default]
    Local,
    Remote,
    Dynamic,
    Kubernetes,
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

// --- Store config (for JSON migration) ---

#[derive(Debug, Default, Serialize, Deserialize)]
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
    #[serde(default)]
    pub color: Option<String>,
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

// --- Tunnel Groups ---

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

#[cfg(test)]
mod tests {
    use super::*;

    fn test_profile() -> ConnectionProfile {
        ConnectionProfile {
            id: "test-id".to_string(),
            name: "test".to_string(),
            forwarding_type: ForwardingType::Local,
            ssh_user: "${USER}".to_string(),
            bastion_host: "${HOST}.example.com".to_string(),
            bastion_port: 22,
            identity_file: "/home/${USER}/.ssh/id_rsa".to_string(),
            local_port: 8080,
            remote_host: Some("${REMOTE}".to_string()),
            remote_port: Some(5432),
            auto_reconnect: true,
            jump_hosts: vec![JumpHost {
                host: "${JUMP}".to_string(),
                port: 22,
                user: "${USER}".to_string(),
            }],
            tags: vec![],
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
        }
    }

    #[test]
    fn env_var_substitution_replaces_all_fields() {
        let mut vars = HashMap::new();
        vars.insert("USER".to_string(), "alice".to_string());
        vars.insert("HOST".to_string(), "prod".to_string());
        vars.insert("REMOTE".to_string(), "db.internal".to_string());
        vars.insert("JUMP".to_string(), "bastion.internal".to_string());

        let result = test_profile().with_env_vars(&vars);

        assert_eq!(result.ssh_user, "alice");
        assert_eq!(result.bastion_host, "prod.example.com");
        assert_eq!(result.identity_file, "/home/alice/.ssh/id_rsa");
        assert_eq!(result.remote_host.as_deref(), Some("db.internal"));
        assert_eq!(result.jump_hosts[0].host, "bastion.internal");
        assert_eq!(result.jump_hosts[0].user, "alice");
    }

    #[test]
    fn env_var_substitution_leaves_unmatched_vars() {
        let vars = HashMap::new();
        let result = test_profile().with_env_vars(&vars);

        assert_eq!(result.ssh_user, "${USER}");
        assert_eq!(result.bastion_host, "${HOST}.example.com");
    }

    #[test]
    fn env_var_substitution_does_not_mutate_original() {
        let profile = test_profile();
        let mut vars = HashMap::new();
        vars.insert("USER".to_string(), "bob".to_string());

        let _ = profile.with_env_vars(&vars);
        assert_eq!(profile.ssh_user, "${USER}");
    }

    #[test]
    fn forwarding_type_default_is_local() {
        assert_eq!(ForwardingType::default(), ForwardingType::Local);
    }

    #[test]
    fn forwarding_type_serde_roundtrip() {
        let json = serde_json::to_string(&ForwardingType::Remote).unwrap();
        assert_eq!(json, "\"remote\"");
        let parsed: ForwardingType = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, ForwardingType::Remote);
    }

    #[test]
    fn action_source_display() {
        assert_eq!(ActionSource::Gui.to_string(), "gui");
        assert_eq!(ActionSource::Cli.to_string(), "cli");
        assert_eq!(ActionSource::Api.to_string(), "api");
    }

    #[test]
    fn connection_profile_serde_defaults() {
        let json = r#"{
            "name": "test",
            "ssh_user": "root",
            "bastion_host": "example.com",
            "bastion_port": 22,
            "local_port": 8080
        }"#;
        let profile: ConnectionProfile = serde_json::from_str(json).unwrap();
        assert_eq!(profile.forwarding_type, ForwardingType::Local);
        assert!(profile.auto_reconnect);
        assert_eq!(profile.workspace_id, "local");
        assert_eq!(profile.version, 1);
        assert!(profile.jump_hosts.is_empty());
        assert!(profile.tags.is_empty());
    }
}
