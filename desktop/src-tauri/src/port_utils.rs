use crate::types::PortInfo;
use parking_lot::RwLock;
use std::collections::HashMap;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

fn parse_lsof_output(output: &str) -> Vec<PortInfo> {
    let mut results = Vec::new();
    for line in output.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 9 {
            continue;
        }
        let process_name = parts[0].to_string();
        let pid: Option<u32> = parts[1].parse().ok();
        let protocol = parts[7].to_string(); // TCP, UDP
        let name_field = parts[8..].join(" ");

        // Parse NAME field: "host:port" or "host:port->remote:port (STATE)"
        let state = if name_field.contains("(LISTEN)") {
            "LISTEN"
        } else if name_field.contains("(ESTABLISHED)") {
            "ESTABLISHED"
        } else if name_field.contains("(CLOSE_WAIT)") {
            "CLOSE_WAIT"
        } else if name_field.contains("(TIME_WAIT)") {
            "TIME_WAIT"
        } else if name_field.contains("(SYN_SENT)") {
            "SYN_SENT"
        } else {
            "UNKNOWN"
        };

        let addr_part = name_field.split('(').next().unwrap_or("").trim();
        let (local_addr, remote_addr) = if addr_part.contains("->") {
            let mut split = addr_part.splitn(2, "->");
            (
                split.next().unwrap_or("").to_string(),
                Some(split.next().unwrap_or("").to_string()),
            )
        } else {
            (addr_part.to_string(), None)
        };

        // Extract port from local_addr
        let port: u16 = local_addr
            .rsplit(':')
            .next()
            .and_then(|p| p.parse().ok())
            .unwrap_or(0);

        results.push(PortInfo {
            port,
            pid,
            process_name: Some(process_name),
            state: state.to_string(),
            local_addr,
            remote_addr,
            protocol: Some(protocol),
        });
    }
    results
}

#[tauri::command]
pub fn scan_port(port: u16) -> Result<Vec<PortInfo>, String> {
    let output = Command::new("lsof")
        .args(["-i", &format!(":{}", port), "-P", "-n"])
        .output()
        .map_err(|e| format!("Failed to run lsof: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_lsof_output(&stdout))
}

#[tauri::command]
pub fn scan_port_range(start: u16, end: u16) -> Result<Vec<PortInfo>, String> {
    if start > end {
        return Err("Start port must be <= end port".to_string());
    }
    if end - start > 1000 {
        return Err("Port range too large (max 1000)".to_string());
    }

    let output = Command::new("lsof")
        .args([
            "-i",
            &format!(":{}-{}", start, end),
            "-P",
            "-n",
        ])
        .output()
        .map_err(|e| format!("Failed to run lsof: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_lsof_output(&stdout))
}

#[tauri::command]
pub fn check_port_available(port: u16) -> Result<bool, String> {
    match std::net::TcpListener::bind(("127.0.0.1", port)) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub fn kill_port(port: u16) -> Result<String, String> {
    let output = Command::new("lsof")
        .args(["-t", "-i", &format!(":{}", port)])
        .output()
        .map_err(|e| format!("Failed to run lsof: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let pids: Vec<&str> = stdout.trim().lines().collect();

    if pids.is_empty() || (pids.len() == 1 && pids[0].is_empty()) {
        return Ok(format!("No processes found on port {}", port));
    }

    let mut killed = 0;
    let mut errors = Vec::new();

    for pid in &pids {
        let pid = pid.trim();
        if pid.is_empty() {
            continue;
        }
        match Command::new("kill").arg(pid).output() {
            Ok(result) => {
                if result.status.success() {
                    killed += 1;
                } else {
                    let err = String::from_utf8_lossy(&result.stderr);
                    errors.push(format!("PID {}: {}", pid, err.trim()));
                }
            }
            Err(e) => errors.push(format!("PID {}: {}", pid, e)),
        }
    }

    let mut msg = format!("Killed {} process(es) on port {}", killed, port);
    if !errors.is_empty() {
        msg.push_str(&format!(". Errors: {}", errors.join("; ")));
    }
    Ok(msg)
}

pub struct PortMonitorManager {
    monitors: RwLock<HashMap<u16, Arc<AtomicBool>>>,
}

impl PortMonitorManager {
    pub fn new() -> Self {
        Self {
            monitors: RwLock::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub fn start_port_monitor(
    port: u16,
    monitor_manager: tauri::State<PortMonitorManager>,
    app: AppHandle,
) -> Result<(), String> {
    let mut monitors = monitor_manager.monitors.write();

    // Stop existing monitor for this port
    if let Some(cancel) = monitors.remove(&port) {
        cancel.store(true, Ordering::Relaxed);
    }

    let cancel_flag = Arc::new(AtomicBool::new(false));
    monitors.insert(port, cancel_flag.clone());
    drop(monitors);

    thread::spawn(move || {
        while !cancel_flag.load(Ordering::Relaxed) {
            let output = Command::new("lsof")
                .args(["-i", &format!(":{}", port), "-P", "-n"])
                .output();

            if let Ok(output) = output {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let info = parse_lsof_output(&stdout);
                let _ = app.emit("port-monitor-update", serde_json::json!({
                    "port": port,
                    "connections": info,
                }));
            }

            thread::sleep(Duration::from_secs(2));
        }
    });

    Ok(())
}

#[tauri::command]
pub fn stop_port_monitor(
    port: u16,
    monitor_manager: tauri::State<PortMonitorManager>,
) -> Result<(), String> {
    let mut monitors = monitor_manager.monitors.write();
    if let Some(cancel) = monitors.remove(&port) {
        cancel.store(true, Ordering::Relaxed);
    }
    Ok(())
}
