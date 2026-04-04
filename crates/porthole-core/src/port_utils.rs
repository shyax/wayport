use crate::types::PortInfo;
use std::process::Command;

fn parse_lsof_output(output: &str) -> Vec<PortInfo> {
    let mut results = Vec::new();
    for line in output.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 9 {
            continue;
        }
        let process_name = parts[0].to_string();
        let pid: Option<u32> = parts[1].parse().ok();
        let protocol = parts[7].to_string();
        let name_field = parts[8..].join(" ");

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

pub fn scan_port(port: u16) -> Result<Vec<PortInfo>, String> {
    let output = Command::new("lsof")
        .args(["-i", &format!(":{}", port), "-P", "-n"])
        .output()
        .map_err(|e| format!("Failed to run lsof: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_lsof_output(&stdout))
}

pub fn scan_port_range(start: u16, end: u16) -> Result<Vec<PortInfo>, String> {
    if start > end {
        return Err("Start port must be <= end port".to_string());
    }
    if end - start > 1000 {
        return Err("Port range too large (max 1000)".to_string());
    }

    let output = Command::new("lsof")
        .args(["-i", &format!(":{}-{}", start, end), "-P", "-n"])
        .output()
        .map_err(|e| format!("Failed to run lsof: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_lsof_output(&stdout))
}

pub fn check_port_available(port: u16) -> Result<bool, String> {
    match std::net::TcpListener::bind(("127.0.0.1", port)) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

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

pub fn find_next_available_port(start_port: u16) -> Result<u16, String> {
    for port in start_port..=65535 {
        if std::net::TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return Ok(port);
        }
    }
    Err("No available ports found".to_string())
}
