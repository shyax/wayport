// --- Forwarding ---

export type ForwardingType = "local" | "remote" | "dynamic" | "kubernetes";

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
  color: string | null;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const ENV_COLORS: Record<string, { hex: string; label: string }> = {
  local: { hex: "#22c55e", label: "Local" },
  development: { hex: "#3b82f6", label: "Development" },
  staging: { hex: "#eab308", label: "Staging" },
  production: { hex: "#ef4444", label: "Production" },
  custom: { hex: "#8b5cf6", label: "Custom" },
};

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
  is_pinned: boolean;
  version: number;
  // Kubernetes port-forward fields
  k8s_context: string | null;
  k8s_namespace: string | null;
  k8s_resource: string | null;
  k8s_resource_port: number | null;
  created_at: string;
  updated_at: string;
}

export type ActionSource = "gui" | "cli" | "api";

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
  source: ActionSource;
}

// --- Tunnel Groups ---

export interface TunnelGroup {
  id: string;
  workspace_id: string;
  name: string;
  profile_ids: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type NewTunnelGroup = Omit<TunnelGroup, "id" | "created_at" | "updated_at">;

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

// --- Tunnel stats ---

export interface TunnelStats {
  profile_id: string;
  local_port: number;
  active_connections: number;
  total_connections: number;
  uptime_secs: number;
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
  is_pinned: false,
  k8s_context: null,
  k8s_namespace: null,
  k8s_resource: null,
  k8s_resource_port: null,
};

export type NewFolder = Omit<Folder, "id" | "created_at" | "updated_at">;

export type NewEnvironment = Omit<Environment, "id" | "created_at" | "updated_at">;
