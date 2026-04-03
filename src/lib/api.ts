import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ConnectionProfile, NewConnectionProfile, TunnelState } from "./types";

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

export async function exportProfiles(): Promise<string> {
  return invoke("export_profiles");
}

export async function importProfiles(): Promise<number> {
  return invoke("import_profiles");
}

export async function selectKeyFile(): Promise<string | null> {
  return invoke("select_key_file");
}

export async function checkSsh(): Promise<{ available: boolean; version: string }> {
  return invoke("check_ssh");
}

export function onTunnelStateUpdate(
  callback: (state: TunnelState) => void,
): Promise<UnlistenFn> {
  return listen<TunnelState>("tunnel-state-update", (event) => {
    callback(event.payload);
  });
}
