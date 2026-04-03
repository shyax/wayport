import { Trash2, Edit2, Copy } from "lucide-react";
import type { ConnectionProfile, TunnelState } from "../lib/types";

interface ConnectionDetailProps {
  profile: ConnectionProfile;
  tunnelState?: TunnelState;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
}

export function ConnectionDetail({
  profile,
  tunnelState,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
}: ConnectionDetailProps) {
  const status = tunnelState?.status ?? "disconnected";
  const isConnected = status === "connected";

  const formatUptime = (connectedSince: string | null) => {
    if (!connectedSince) return "";
    const ms = Date.now() - new Date(connectedSince).getTime();
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const statusDisplay = {
    disconnected: { label: "Disconnected", color: "text-slate-500" },
    connecting: { label: "Connecting...", color: "text-yellow-500" },
    connected: { label: "Connected", color: "text-green-500" },
    reconnecting: { label: "Reconnecting...", color: "text-orange-500" },
    error: { label: "Error", color: "text-red-500" },
  };

  const { label, color } = statusDisplay[status];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">{profile.name}</h2>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Status:</span>
            <span className={`font-medium ${color}`}>
              {label}
              {isConnected && tunnelState?.connected_since && (
                <span className="text-slate-400 ml-2">
                  ({formatUptime(tunnelState.connected_since)})
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Port Forwarding:</span>
            <code className="text-blue-400 bg-slate-900 px-2 py-1 rounded">
              localhost:{profile.local_port} → {profile.remote_host}:
              {profile.remote_port}
            </code>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Bastion:</span>
            <code className="text-blue-400 bg-slate-900 px-2 py-1 rounded">
              {profile.ssh_user}@{profile.bastion_host}:{profile.bastion_port}
            </code>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">SSH Key:</span>
            <span className="text-slate-300">{profile.identity_file}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Auto-reconnect:</span>
            <span className="text-slate-300">
              {profile.auto_reconnect ? "Enabled" : "Disabled"}
            </span>
          </div>

          {tunnelState?.error && (
            <div className="bg-red-900/20 border border-red-700 rounded p-3">
              <p className="text-red-400 text-xs font-mono">
                {tunnelState.error}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {isConnected ? (
          <button
            onClick={() => onDisconnect(profile.id)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => onConnect(profile.id)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition"
          >
            Connect
          </button>
        )}
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition flex items-center gap-2"
        >
          <Edit2 size={16} />
          Edit
        </button>
        <button
          onClick={() => onDelete(profile.id)}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition flex items-center gap-2"
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </div>
  );
}
