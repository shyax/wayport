// --- Forwarding ---

export type ForwardingType = "local" | "remote" | "dynamic";

export interface JumpHost {
  host: string;
  port: number;
  user: string;
}

// --- Core data models ---

export interface Workspace {
  id: string;
  name: string;
  type: "personal" | "team";
  is_local: boolean;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: string;
  workspace_id: string;
  name: string;
  variables: Record<string, string>;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectionProfile {
  id: string;
  name: string;
  workspace_id: string;
  folder_id: string | null;
  forwarding_type: ForwardingType;
  ssh_user: string;
  bastion_host: string;
  bastion_port: number;
  identity_file: string;
  local_port: number;
  remote_host: string | null;
  remote_port: number | null;
  auto_reconnect: boolean;
  jump_hosts: JumpHost[];
  tags: string[];
  sort_order: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface HistoryEntry {
  id: string;
  workspace_id: string;
  profile_id: string | null;
  profile_name: string;
  user_display_name: string;
  action: "connect" | "disconnect" | "error" | "reconnect";
  details: string | null;
  duration_secs: number | null;
  created_at: string;
}

// --- Tunnel runtime ---

export type TunnelStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface TunnelState {
  profile_id: string;
  status: TunnelStatus;
  error: string | null;
  connected_since: string | null;
  reconnect_attempt: number;
}

// --- Port utilities ---

export interface PortInfo {
  port: number;
  pid: number | null;
  process_name: string | null;
  state: string;
  local_addr: string;
  remote_addr: string | null;
  protocol: string | null;
}

export interface PortMonitorUpdate {
  port: number;
  connections: PortInfo[];
}

// --- Helpers ---

export type NewConnectionProfile = Omit<
  ConnectionProfile,
  "id" | "created_at" | "updated_at" | "version"
>;

export const DEFAULT_PROFILE: NewConnectionProfile = {
  name: "",
  workspace_id: "local",
  folder_id: null,
  forwarding_type: "local",
  ssh_user: "",
  bastion_host: "",
  bastion_port: 22,
  identity_file: "",
  local_port: 5433,
  remote_host: "",
  remote_port: 5432,
  auto_reconnect: true,
  jump_hosts: [],
  tags: [],
  sort_order: 0,
};

export type NewFolder = Omit<Folder, "id" | "created_at" | "updated_at">;

export type NewEnvironment = Omit<Environment, "id" | "created_at" | "updated_at">;
