use crate::types::{ConnectionProfile, ForwardingType};

pub fn parse_ssh_config() -> Result<Vec<ConnectionProfile>, String> {
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

    let home_str = home.to_string_lossy().to_string();

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
            "identityfile" => current_identity = value.replace("~", &home_str),
            _ => {}
        }
    }

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
