use crate::types::{ConnectionProfile, TunnelState, TunnelStatus};
use std::collections::HashMap;
use std::process::{Child, Stdio};
use parking_lot::RwLock;
use std::net::TcpStream;
use std::time::Duration;
use std::thread;
use chrono::Utc;
use std::sync::Arc;

pub struct ManagedTunnel {
    pub profile_id: String,
    pub process: Option<Child>,
    pub state: TunnelState,
    pub reconnect_timer: Option<std::thread::JoinHandle<()>>,
}

pub struct TunnelManager {
    tunnels: Arc<RwLock<HashMap<String, ManagedTunnel>>>,
}

impl TunnelManager {
    pub fn new() -> Self {
        Self {
            tunnels: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn get_states(&self) -> HashMap<String, TunnelState> {
        self.tunnels
            .read()
            .iter()
            .map(|(k, v)| (k.clone(), v.state.clone()))
            .collect()
    }

    pub fn start_tunnel(
        &self,
        profile: ConnectionProfile,
        on_state_update: impl Fn(TunnelState) + Send + 'static,
    ) {
        let profile_id = profile.id.clone();

        let mut tunnels = self.tunnels.write();

        // Stop existing tunnel first
        if let Some(existing) = tunnels.remove(&profile_id) {
            if let Some(mut proc) = existing.process {
                let _ = proc.kill();
            }
        }

        // Update to connecting state
        let connecting_state = TunnelState {
            profile_id: profile_id.clone(),
            status: TunnelStatus::Connecting,
            error: None,
            connected_since: None,
            reconnect_attempt: 0,
        };
        on_state_update(connecting_state.clone());

        // Create tunnel
        let tunnel = ManagedTunnel {
            profile_id: profile_id.clone(),
            process: None,
            state: connecting_state,
            reconnect_timer: None,
        };
        tunnels.insert(profile_id.clone(), tunnel);
        drop(tunnels);

        // Spawn tunnel in background
        let tunnels = self.tunnels.clone();
        let profile_clone = profile.clone();
        std::thread::spawn(move || {
            Self::spawn_ssh_process(&profile_clone, &tunnels, on_state_update);
        });
    }

    fn spawn_ssh_process(
        profile: &ConnectionProfile,
        tunnels: &Arc<RwLock<HashMap<String, ManagedTunnel>>>,
        on_state_update: impl Fn(TunnelState) + Send + 'static,
    ) {
        let port_forward = format!(
            "{}:{}:{}",
            profile.local_port, profile.remote_host, profile.remote_port
        );
        let bastion_port = profile.bastion_port.to_string();
        let bastion_addr = format!("{}@{}", profile.ssh_user, profile.bastion_host);

        let args = vec![
            "-i",
            &profile.identity_file,
            "-L",
            &port_forward,
            "-N",
            "-o",
            "ServerAliveInterval=15",
            "-o",
            "ServerAliveCountMax=3",
            "-o",
            "ExitOnForwardFailure=yes",
            "-o",
            "StrictHostKeyChecking=accept-new",
            "-p",
            &bastion_port,
            &bastion_addr,
        ];

        match std::process::Command::new("ssh")
            .args(args)
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(mut child) => {
                // Try to verify connection with TCP probe
                thread::sleep(Duration::from_millis(500));

                if Self::verify_port_reachable(profile.local_port) {
                    // Connected!
                    let connected_state = TunnelState {
                        profile_id: profile.id.clone(),
                        status: TunnelStatus::Connected,
                        error: None,
                        connected_since: Some(Utc::now().to_rfc3339()),
                        reconnect_attempt: 0,
                    };
                    on_state_update(connected_state.clone());

                    let mut tunnels = tunnels.write();
                    if let Some(tunnel) = tunnels.get_mut(&profile.id) {
                        tunnel.process = Some(child);
                        tunnel.state = connected_state;
                    }
                } else {
                    // Port not reachable - kill process
                    let _ = child.kill();

                    let error_state = TunnelState {
                        profile_id: profile.id.clone(),
                        status: TunnelStatus::Error,
                        error: Some("Failed to establish tunnel - port not reachable".to_string()),
                        connected_since: None,
                        reconnect_attempt: 0,
                    };
                    on_state_update(error_state.clone());

                    let mut tunnels = tunnels.write();
                    if let Some(tunnel) = tunnels.get_mut(&profile.id) {
                        tunnel.process = None;
                        tunnel.state = error_state;
                    }
                }
            }
            Err(e) => {
                let error_state = TunnelState {
                    profile_id: profile.id.clone(),
                    status: TunnelStatus::Error,
                    error: Some(format!("Failed to start SSH: {}", e)),
                    connected_since: None,
                    reconnect_attempt: 0,
                };
                on_state_update(error_state.clone());

                let mut tunnels = tunnels.write();
                if let Some(tunnel) = tunnels.get_mut(&profile.id) {
                    tunnel.state = error_state;
                }
            }
        }
    }

    fn verify_port_reachable(port: u16) -> bool {
        for _ in 0..20 {
            if TcpStream::connect(("127.0.0.1", port)).is_ok() {
                return true;
            }
            thread::sleep(Duration::from_millis(500));
        }
        false
    }

    pub fn stop_tunnel(&self, profile_id: &str) {
        let mut tunnels = self.tunnels.write();
        if let Some(tunnel) = tunnels.remove(profile_id) {
            if let Some(mut proc) = tunnel.process {
                let _ = proc.kill();
            }
        }
    }

    pub fn stop_all_tunnels(&self) {
        let mut tunnels = self.tunnels.write();
        for (_, tunnel) in tunnels.drain() {
            if let Some(mut proc) = tunnel.process {
                let _ = proc.kill();
            }
        }
    }
}
