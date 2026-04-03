export interface ConnectionProfile {
  id: string;
  name: string;
  ssh_user: string;
  bastion_host: string;
  bastion_port: number;
  identity_file: string;
  local_port: number;
  remote_host: string;
  remote_port: number;
  auto_reconnect: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

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

export type NewConnectionProfile = Omit<
  ConnectionProfile,
  "id" | "created_at" | "updated_at"
>;

export const DEFAULT_PROFILE: NewConnectionProfile = {
  name: "",
  ssh_user: "",
  bastion_host: "",
  bastion_port: 22,
  identity_file: "",
  local_port: 5433,
  remote_host: "",
  remote_port: 5432,
  auto_reconnect: true,
  tags: [],
};
