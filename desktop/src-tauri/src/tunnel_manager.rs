use crate::types::{ConnectionProfile, ForwardingType, TunnelState, TunnelStats, TunnelStatus};
use chrono::Utc;
use parking_lot::RwLock;
use std::collections::HashMap;
use std::net::TcpStream;
use std::process::{Child, Stdio};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

pub struct ManagedTunnel {
    pub profile_id: String,
    pub process: Option<Child>,
    pub state: TunnelState,
    pub reconnect_timer: Option<std::thread::JoinHandle<()>>,
    pub logs: Vec<String>,
    pub local_port: u16,
    pub total_connections: u64,
    pub peak_connections: u32,
}

#[derive(Default)]
pub struct TunnelManager {
    tunnels: Arc<RwLock<HashMap<String, ManagedTunnel>>>,
}

impl TunnelManager {
    pub fn new() -> Self {
        Self::default()
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
        // Create tunnel
        let tunnel = ManagedTunnel {
            profile_id: profile_id.clone(),
            process: None,
            state: connecting_state.clone(),
            reconnect_timer: None,
            logs: Vec::new(),
            local_port: profile.local_port,
            total_connections: 0,
            peak_connections: 0,
        };
        tunnels.insert(profile_id.clone(), tunnel);
        drop(tunnels);

        // Notify after releasing the write lock to avoid deadlock —
        // the callback calls update_tray_tooltip which read-locks the same RwLock.
        on_state_update(connecting_state);

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
                args.push(format!(
                    "{}:{}:{}",
                    profile.local_port, remote_host, remote_port
                ));
            }
            ForwardingType::Remote => {
                let remote_host = profile.remote_host.as_deref().unwrap_or("localhost");
                let remote_port = profile.remote_port.unwrap_or(22);
                args.push("-R".to_string());
                args.push(format!(
                    "{}:{}:{}",
                    profile.local_port, remote_host, remote_port
                ));
            }
            ForwardingType::Dynamic => {
                args.push("-D".to_string());
                args.push(profile.local_port.to_string());
            }
            ForwardingType::Kubernetes => {
                // Kubernetes port-forward is handled separately, not via SSH.
                // Return empty args — the caller should use kubectl instead.
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
            ForwardingType::Local | ForwardingType::Dynamic | ForwardingType::Kubernetes => {
                Self::verify_port_reachable(local_port)
            }
            ForwardingType::Remote => {
                // For remote forwarding, we can't probe locally —
                // just check the process is still alive after a delay.
                thread::sleep(Duration::from_secs(2));
                matches!(child.try_wait(), Ok(None))
            }
        }
    }

    fn build_kubectl_args(profile: &ConnectionProfile) -> Vec<String> {
        let mut args: Vec<String> = Vec::new();
        args.push("port-forward".to_string());

        if let Some(ref ctx) = profile.k8s_context {
            if !ctx.is_empty() {
                args.push("--context".to_string());
                args.push(ctx.clone());
            }
        }
        if let Some(ref ns) = profile.k8s_namespace {
            if !ns.is_empty() {
                args.push("--namespace".to_string());
                args.push(ns.clone());
            }
        }

        let resource = profile.k8s_resource.as_deref().unwrap_or("pod/unknown");
        args.push(resource.to_string());

        let resource_port = profile.k8s_resource_port.unwrap_or(profile.local_port);
        args.push(format!("{}:{}", profile.local_port, resource_port));

        args
    }

    fn spawn_ssh_process(
        profile: &ConnectionProfile,
        tunnels: &Arc<RwLock<HashMap<String, ManagedTunnel>>>,
        on_state_update: impl Fn(TunnelState) + Send + 'static,
    ) {
        let (cmd, args) = if profile.forwarding_type == ForwardingType::Kubernetes {
            ("kubectl".to_string(), Self::build_kubectl_args(profile))
        } else {
            ("ssh".to_string(), Self::build_ssh_args(profile))
        };

        match std::process::Command::new(&cmd)
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
                        for line in reader.lines().map_while(Result::ok) {
                            let mut tunnels = stderr_tunnels.write();
                            if let Some(tunnel) = tunnels.get_mut(&stderr_profile_id) {
                                tunnel.logs.push(line);
                                if tunnel.logs.len() > 200 {
                                    tunnel.logs.drain(0..tunnel.logs.len() - 200);
                                }
                            } else {
                                break;
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
                        tunnels
                            .get(&profile.id)
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
                    error: Some(format!("Failed to start {}: {}", cmd, e)),
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

    fn count_port_connections(port: u16) -> u32 {
        // Use lsof to count ESTABLISHED connections on the port
        let output = std::process::Command::new("lsof")
            .args([
                "-i",
                &format!("TCP:{}", port),
                "-s",
                "TCP:ESTABLISHED",
                "-P",
                "-n",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                // Subtract 1 for the header line, minimum 0
                let lines = stdout.lines().count();
                if lines > 1 {
                    (lines - 1) as u32
                } else {
                    0
                }
            }
            Err(_) => 0,
        }
    }

    pub fn get_stats(&self) -> Vec<TunnelStats> {
        let mut tunnels = self.tunnels.write();
        let mut stats = Vec::new();

        for (_, tunnel) in tunnels.iter_mut() {
            if tunnel.state.status != TunnelStatus::Connected {
                continue;
            }

            let active = Self::count_port_connections(tunnel.local_port);

            // Track total connections (new connections since last poll)
            if active > tunnel.peak_connections {
                tunnel.total_connections += (active - tunnel.peak_connections) as u64;
            }
            tunnel.peak_connections = active;

            let uptime_secs = tunnel
                .state
                .connected_since
                .as_ref()
                .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| (Utc::now() - dt.with_timezone(&Utc)).num_seconds().max(0) as u64)
                .unwrap_or(0);

            stats.push(TunnelStats {
                profile_id: tunnel.profile_id.clone(),
                local_port: tunnel.local_port,
                active_connections: active,
                total_connections: tunnel.total_connections,
                uptime_secs,
            });
        }

        stats
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
