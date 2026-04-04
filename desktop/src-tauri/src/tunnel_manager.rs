use crate::types::{ConnectionProfile, ForwardingType, TunnelState, TunnelStatus};
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
    pub logs: Vec<String>,
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

    pub fn get_logs(&self, profile_id: &str) -> Vec<String> {
        self.tunnels
            .read()
            .get(profile_id)
            .map(|t| t.logs.clone())
            .unwrap_or_default()
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
            logs: Vec::new(),
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

    fn build_ssh_args(profile: &ConnectionProfile) -> Vec<String> {
        let mut args: Vec<String> = Vec::new();

        // Identity file
        if !profile.identity_file.is_empty() {
            args.push("-i".to_string());
            args.push(profile.identity_file.clone());
        }

        // Forwarding flag based on type
        match profile.forwarding_type {
            ForwardingType::Local => {
                let remote_host = profile.remote_host.as_deref().unwrap_or("localhost");
                let remote_port = profile.remote_port.unwrap_or(22);
                args.push("-L".to_string());
                args.push(format!("{}:{}:{}", profile.local_port, remote_host, remote_port));
            }
            ForwardingType::Remote => {
                let remote_host = profile.remote_host.as_deref().unwrap_or("localhost");
                let remote_port = profile.remote_port.unwrap_or(22);
                args.push("-R".to_string());
                args.push(format!("{}:{}:{}", profile.local_port, remote_host, remote_port));
            }
            ForwardingType::Dynamic => {
                args.push("-D".to_string());
                args.push(profile.local_port.to_string());
            }
        }

        // ProxyJump for multi-hop
        if !profile.jump_hosts.is_empty() {
            let jumps: Vec<String> = profile
                .jump_hosts
                .iter()
                .map(|jh| format!("{}@{}:{}", jh.user, jh.host, jh.port))
                .collect();
            args.push("-J".to_string());
            args.push(jumps.join(","));
        }

        // Common options
        args.push("-N".to_string());
        args.push("-o".to_string());
        args.push("ServerAliveInterval=15".to_string());
        args.push("-o".to_string());
        args.push("ServerAliveCountMax=3".to_string());
        args.push("-o".to_string());
        args.push("ExitOnForwardFailure=yes".to_string());
        args.push("-o".to_string());
        args.push("StrictHostKeyChecking=accept-new".to_string());
        args.push("-p".to_string());
        args.push(profile.bastion_port.to_string());
        args.push(format!("{}@{}", profile.ssh_user, profile.bastion_host));

        args
    }

    fn verify_tunnel(forwarding_type: ForwardingType, local_port: u16, child: &mut Child) -> bool {
        match forwarding_type {
            ForwardingType::Local | ForwardingType::Dynamic => {
                Self::verify_port_reachable(local_port)
            }
            ForwardingType::Remote => {
                // For remote forwarding, the bind is on the server side.
                // We can't probe locally — just check the process is still alive after a delay.
                thread::sleep(Duration::from_secs(2));
                matches!(child.try_wait(), Ok(None))
            }
        }
    }

    fn spawn_ssh_process(
        profile: &ConnectionProfile,
        tunnels: &Arc<RwLock<HashMap<String, ManagedTunnel>>>,
        on_state_update: impl Fn(TunnelState) + Send + 'static,
    ) {
        let args = Self::build_ssh_args(profile);

        match std::process::Command::new("ssh")
            .args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(mut child) => {
                // Capture stderr in a background thread
                let stderr_tunnels = tunnels.clone();
                let stderr_profile_id = profile.id.clone();
                if let Some(stderr) = child.stderr.take() {
                    let stderr_tunnels = stderr_tunnels.clone();
                    thread::spawn(move || {
                        use std::io::{BufRead, BufReader};
                        let reader = BufReader::new(stderr);
                        for line in reader.lines() {
                            if let Ok(line) = line {
                                let mut tunnels = stderr_tunnels.write();
                                if let Some(tunnel) = tunnels.get_mut(&stderr_profile_id) {
                                    tunnel.logs.push(line);
                                    // Keep last 200 lines
                                    if tunnel.logs.len() > 200 {
                                        tunnel.logs.drain(0..tunnel.logs.len() - 200);
                                    }
                                } else {
                                    break;
                                }
                            }
                        }
                    });
                }

                thread::sleep(Duration::from_millis(500));

                if Self::verify_tunnel(profile.forwarding_type, profile.local_port, &mut child) {
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
                    let _ = child.kill();

                    // Read any captured stderr for a better error message
                    let stderr_msg = {
                        let tunnels = tunnels.read();
                        tunnels.get(&profile.id)
                            .and_then(|t| t.logs.last().cloned())
                            .unwrap_or_default()
                    };

                    let error_msg = if stderr_msg.is_empty() {
                        "Failed to establish tunnel - port not reachable".to_string()
                    } else {
                        format!("Tunnel failed: {}", stderr_msg)
                    };

                    let error_state = TunnelState {
                        profile_id: profile.id.clone(),
                        status: TunnelStatus::Error,
                        error: Some(error_msg),
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

    pub fn has_tunnel(&self, profile_id: &str) -> bool {
        self.tunnels.read().contains_key(profile_id)
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
