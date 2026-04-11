import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  ConnectionProfile,
  NewConnectionProfile,
  TunnelState,
  TunnelStats,
  TunnelGroup,
  PortInfo,
  PortMonitorUpdate,
  Workspace,
  Folder,
  Environment,
  HistoryEntry,
} from "./types";

// --- Profile CRUD ---

export async function listProfiles(): Promise<ConnectionProfile[]> {
  return invoke("list_profiles");
}

export async function createProfile(
  profile: NewConnectionProfile,
): Promise<ConnectionProfile> {
  return invoke("create_profile", { profile });
}

export async function updateProfile(
  profile: ConnectionProfile,
): Promise<ConnectionProfile> {
  return invoke("update_profile", { profile });
}

export async function deleteProfile(id: string): Promise<void> {
  return invoke("delete_profile", { id });
}

// --- Tunnel management ---

export async function startTunnel(profileId: string, envVars?: Record<string, string>): Promise<void> {
  return invoke("start_tunnel", { profileId, envVars: envVars ?? null });
}

export async function stopTunnel(profileId: string): Promise<void> {
  return invoke("stop_tunnel", { profileId });
}

export async function stopAllTunnels(): Promise<void> {
  return invoke("stop_all_tunnels");
}

export async function getTunnelStates(): Promise<Record<string, TunnelState>> {
  return invoke("get_tunnel_states");
}

// --- Tunnel stats ---

export async function getTunnelStats(): Promise<TunnelStats[]> {
  return invoke("get_tunnel_stats");
}

// --- Import/Export ---

export async function exportProfiles(format?: "json" | "yaml" | "toml"): Promise<string> {
  return invoke("export_profiles", { format: format ?? null });
}

export async function importProfiles(): Promise<number> {
  return invoke("import_profiles");
}

// --- Utilities ---

export async function checkSsh(): Promise<{
  available: boolean;
  version: string;
}> {
  return invoke("check_ssh");
}

// --- Port utilities ---

export async function scanPort(port: number): Promise<PortInfo[]> {
  return invoke("scan_port", { port });
}

export async function scanPortRange(
  start: number,
  end: number,
): Promise<PortInfo[]> {
  return invoke("scan_port_range", { start, end });
}

export async function checkPortAvailable(port: number): Promise<boolean> {
  return invoke("check_port_available", { port });
}

export async function killPort(port: number): Promise<string> {
  return invoke("kill_port", { port });
}

export async function startPortMonitor(port: number): Promise<void> {
  return invoke("start_port_monitor", { port });
}

export async function stopPortMonitor(port: number): Promise<void> {
  return invoke("stop_port_monitor", { port });
}

// --- Tunnel Groups ---

export async function listGroups(workspaceId: string): Promise<TunnelGroup[]> {
  return invoke("list_groups", { workspaceId });
}

export async function createGroup(group: TunnelGroup): Promise<TunnelGroup> {
  return invoke("create_group", { group });
}

export async function updateGroup(group: TunnelGroup): Promise<TunnelGroup> {
  return invoke("update_group", { group });
}

export async function deleteGroup(id: string): Promise<void> {
  return invoke("delete_group", { id });
}

export async function startGroup(groupId: string, envVars?: Record<string, string>): Promise<void> {
  return invoke("start_group", { groupId, envVars: envVars ?? null });
}

export async function stopGroup(groupId: string): Promise<void> {
  return invoke("stop_group", { groupId });
}

// --- Workspaces ---

export async function listWorkspaces(): Promise<Workspace[]> {
  return invoke("list_workspaces");
}

// --- Folders ---

export async function listFolders(workspaceId: string): Promise<Folder[]> {
  return invoke("list_folders", { workspaceId });
}

export async function createFolder(folder: Folder): Promise<Folder> {
  return invoke("create_folder", { folder });
}

export async function updateFolder(folder: Folder): Promise<Folder> {
  return invoke("update_folder", { folder });
}

export async function deleteFolder(id: string): Promise<void> {
  return invoke("delete_folder", { id });
}

// --- Environments ---

export async function listEnvironments(
  workspaceId: string,
): Promise<Environment[]> {
  return invoke("list_environments", { workspaceId });
}

export async function createEnvironment(
  environment: Environment,
): Promise<Environment> {
  return invoke("create_environment", { environment });
}

export async function updateEnvironment(
  environment: Environment,
): Promise<Environment> {
  return invoke("update_environment", { environment });
}

export async function deleteEnvironment(id: string): Promise<void> {
  return invoke("delete_environment", { id });
}

// --- History ---

export async function getHistory(
  workspaceId: string,
  limit?: number,
): Promise<HistoryEntry[]> {
  return invoke("get_history", { workspaceId, limit: limit ?? null });
}

export async function recordConnectionEvent(
  entry: HistoryEntry,
): Promise<void> {
  return invoke("record_connection_event", { entry });
}

// --- Preferences ---

export async function getPreference(key: string): Promise<string | null> {
  return invoke("get_preference", { key });
}

export async function setPreference(
  key: string,
  value: string,
): Promise<void> {
  return invoke("set_preference", { key, value });
}

// --- Tunnel logs ---

export async function getTunnelLogs(profileId: string): Promise<string[]> {
  return invoke("get_tunnel_logs", { profileId });
}

// --- SSH Keys ---

export interface SshKeyInfo {
  name: string;
  path: string;
  key_type: string;
  has_public: boolean;
}

export async function listSshKeys(): Promise<SshKeyInfo[]> {
  return invoke("list_ssh_keys");
}

export async function getPublicKey(name: string): Promise<string> {
  return invoke("get_public_key", { name });
}

export async function generateSshKey(name: string, keyType: string): Promise<string> {
  return invoke("generate_ssh_key", { name, keyType });
}

// --- SSH config import ---

export async function importSshConfig(): Promise<ConnectionProfile[]> {
  return invoke("import_ssh_config");
}

// --- Port conflict ---

export async function findNextAvailablePort(startPort: number): Promise<number> {
  return invoke("find_next_available_port", { startPort });
}

// --- Connection test ---

export async function testConnection(
  profile: ConnectionProfile | NewConnectionProfile,
  envVars?: Record<string, string>,
): Promise<{ success: boolean; message: string; latency_ms: number }> {
  return invoke("test_connection", { profile, envVars: envVars ?? null });
}

// --- Open terminal ---

export async function openTerminal(profileId: string, envVars?: Record<string, string>): Promise<void> {
  return invoke("open_terminal", { profileId, envVars: envVars ?? null });
}

// --- Autostart ---

export async function getAutostartEnabled(): Promise<boolean> {
  return invoke("get_autostart_enabled");
}

export async function setAutostartEnabled(enabled: boolean): Promise<void> {
  return invoke("set_autostart_enabled", { enabled });
}

// --- Pin/Unpin ---

export async function pinProfile(profileId: string): Promise<void> {
  return invoke("pin_profile", { profileId });
}

export async function unpinProfile(profileId: string): Promise<void> {
  return invoke("unpin_profile", { profileId });
}

// --- Recent profiles ---

export async function getRecentProfiles(workspaceId: string, limit: number = 5): Promise<string[]> {
  return invoke("get_recent_profiles", { workspaceId, limit });
}

// --- Auth tokens (Rust persistence) ---

export interface RustAuthTokens {
  access_token: string | null;
  id_token: string | null;
  refresh_token: string | null;
  email: string | null;
  expires_at: number | null;
}

export async function loadAuthTokens(): Promise<RustAuthTokens | null> {
  return invoke("load_auth_tokens");
}

export async function saveAuthTokens(tokens: RustAuthTokens): Promise<void> {
  return invoke("save_auth_tokens", { tokens });
}

export async function clearAuthTokens(): Promise<void> {
  return invoke("clear_auth_tokens");
}

// --- Event listeners ---

export function onTunnelStateUpdate(
  callback: (state: TunnelState) => void,
): Promise<UnlistenFn> {
  return listen<TunnelState>("tunnel-state-update", (event) => {
    callback(event.payload);
  });
}

export function onPortMonitorUpdate(
  callback: (data: PortMonitorUpdate) => void,
): Promise<UnlistenFn> {
  return listen<PortMonitorUpdate>("port-monitor-update", (event) => {
    callback(event.payload);
  });
}
