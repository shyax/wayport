import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  ConnectionProfile,
  NewConnectionProfile,
  TunnelState,
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

export async function startTunnel(profileId: string): Promise<void> {
  return invoke("start_tunnel", { profileId });
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

// --- Import/Export ---

export async function exportProfiles(): Promise<string> {
  return invoke("export_profiles");
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
