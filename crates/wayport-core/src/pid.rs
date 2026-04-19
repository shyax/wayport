use crate::config::tunnels_dir;
use crate::types::ActionSource;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize)]
struct PidEntry {
    pid: u32,
    source: ActionSource,
    #[serde(default)]
    connected_since: Option<String>,
}

fn pid_file_path(profile_id: &str) -> PathBuf {
    tunnels_dir().join(format!("{}.pid", profile_id))
}

pub fn write_pid(profile_id: &str, pid: u32, source: ActionSource) -> Result<(), String> {
    let entry = PidEntry {
        pid,
        source,
        connected_since: Some(chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)),
    };
    let json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
    std::fs::write(pid_file_path(profile_id), json).map_err(|e| e.to_string())
}

pub fn read_pid(profile_id: &str) -> Option<(u32, ActionSource)> {
    let path = pid_file_path(profile_id);
    let content = std::fs::read_to_string(path).ok()?;
    let entry: PidEntry = serde_json::from_str(&content).ok()?;
    Some((entry.pid, entry.source))
}

pub fn read_pid_full(profile_id: &str) -> Option<(u32, ActionSource, Option<String>)> {
    let path = pid_file_path(profile_id);
    let content = std::fs::read_to_string(path).ok()?;
    let entry: PidEntry = serde_json::from_str(&content).ok()?;
    Some((entry.pid, entry.source, entry.connected_since))
}

pub fn remove_pid(profile_id: &str) {
    let _ = std::fs::remove_file(pid_file_path(profile_id));
}

pub fn is_process_alive(pid: u32) -> bool {
    #[cfg(unix)]
    let result = unsafe { libc::kill(pid as i32, 0) == 0 };

    #[cfg(windows)]
    let result = {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if !handle.is_null() {
                CloseHandle(handle);
            }
            !handle.is_null()
        }
    };

    #[cfg(not(any(unix, windows)))]
    let result = true;

    result
}

pub fn list_active_tunnels() -> Vec<(String, u32, ActionSource, Option<String>)> {
    let dir = tunnels_dir();
    let mut active = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("pid") {
                continue;
            }
            let profile_id = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();

            if let Some((pid, source, connected_since)) = read_pid_full(&profile_id) {
                if is_process_alive(pid) {
                    active.push((profile_id, pid, source, connected_since));
                } else {
                    remove_pid(&profile_id);
                }
            }
        }
    }

    active
}
