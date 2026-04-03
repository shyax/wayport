import {
  Trash2,
  Edit2,
  Play,
  Square,
  Server,
  Key,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Globe,
  AlertCircle,
} from "lucide-react";
import type { ConnectionProfile, TunnelState, TunnelStatus } from "../lib/types";

interface ConnectionDetailProps {
  profile: ConnectionProfile;
  tunnelState?: TunnelState;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
}

const STATUS_CONFIG: Record<
  TunnelStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  disconnected: {
    label: "Disconnected",
    color: "text-status-disconnected",
    bg: "bg-surface",
    dot: "bg-status-disconnected",
  },
  connecting: {
    label: "Connecting",
    color: "text-status-connecting",
    bg: "bg-status-connecting-bg",
    dot: "bg-status-connecting animate-status-pulse",
  },
  connected: {
    label: "Connected",
    color: "text-status-connected",
    bg: "bg-status-connected-bg",
    dot: "bg-status-connected",
  },
  reconnecting: {
    label: "Reconnecting",
    color: "text-status-reconnecting",
    bg: "bg-status-reconnecting-bg",
    dot: "bg-status-reconnecting animate-status-pulse",
  },
  error: {
    label: "Error",
    color: "text-status-error",
    bg: "bg-status-error-bg",
    dot: "bg-status-error",
  },
};

const TYPE_CONFIG: Record<string, { label: string; flag: string; color: string }> = {
  local: { label: "Local Forward", flag: "-L", color: "text-accent bg-accent/10 border-accent/20" },
  remote: { label: "Remote Forward", flag: "-R", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  dynamic: { label: "SOCKS Proxy", flag: "-D", color: "text-status-connecting bg-status-connecting/10 border-status-connecting/20" },
};

function formatUptime(connectedSince: string | null): string {
  if (!connectedSince) return "";
  const ms = Date.now() - new Date(connectedSince).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function ForwardingDiagram({ profile }: { profile: ConnectionProfile }) {
  if (profile.forwarding_type === "dynamic") {
    return (
      <div className="flex items-center gap-3 font-mono text-sm">
        <div className="px-3 py-2 rounded-lg bg-surface border border-border">
          <span className="text-text-muted text-xs block">Local</span>
          <span className="text-accent">localhost:{profile.local_port}</span>
        </div>
        <ArrowRight size={16} className="text-text-muted flex-shrink-0" />
        <div className="px-3 py-2 rounded-lg bg-surface border border-border">
          <span className="text-text-muted text-xs block">SOCKS5</span>
          <span className="text-status-connecting">Proxy Tunnel</span>
        </div>
      </div>
    );
  }

  const isRemote = profile.forwarding_type === "remote";
  const Arrow = isRemote ? ArrowLeft : ArrowRight;

  return (
    <div className="flex items-center gap-3 font-mono text-sm">
      <div className="px-3 py-2 rounded-lg bg-surface border border-border">
        <span className="text-text-muted text-xs block">{isRemote ? "Remote Bind" : "Local"}</span>
        <span className="text-accent">
          {isRemote ? `${profile.bastion_host}:` : "localhost:"}
          {profile.local_port}
        </span>
      </div>
      <Arrow size={16} className="text-text-muted flex-shrink-0" />
      <div className="px-3 py-2 rounded-lg bg-surface border border-border">
        <span className="text-text-muted text-xs block">{isRemote ? "Target" : "Remote"}</span>
        <span className={isRemote ? "text-purple-400" : "text-status-connected"}>
          {profile.remote_host}:{profile.remote_port}
        </span>
      </div>
    </div>
  );
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
  const isActive = status === "connecting" || status === "reconnecting";
  const statusInfo = STATUS_CONFIG[status];
  const typeInfo = TYPE_CONFIG[profile.forwarding_type] ?? TYPE_CONFIG.local;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-semibold tracking-tight text-text-primary">
              {profile.name}
            </h2>
            <span
              className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border ${typeInfo.color}`}
            >
              {typeInfo.flag} {typeInfo.label}
            </span>
          </div>
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
            <span className={`text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {isConnected && tunnelState?.connected_since && (
              <span className="text-xs text-text-muted">
                {formatUptime(tunnelState.connected_since)}
              </span>
            )}
            {tunnelState?.reconnect_attempt ? (
              <span className="text-xs text-text-muted">
                attempt {tunnelState.reconnect_attempt}
              </span>
            ) : null}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="focus-ring p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-colors duration-150"
            title="Edit"
            aria-label="Edit connection"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onDelete(profile.id)}
            className="focus-ring p-2 rounded-lg border border-border text-text-secondary hover:text-status-error hover:border-status-error/30 cursor-pointer transition-colors duration-150"
            title="Delete"
            aria-label="Delete connection"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Port Forwarding Diagram */}
      <div className="p-4 rounded-xl bg-bg-elevated border border-border">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
          Port Forwarding
        </p>
        <ForwardingDiagram profile={profile} />
      </div>

      {/* Connection Details */}
      <div className="p-4 rounded-xl bg-bg-elevated border border-border">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
          Connection
        </p>
        <div className="space-y-3">
          <DetailRow
            icon={<Server size={14} />}
            label="Bastion"
            value={`${profile.ssh_user}@${profile.bastion_host}:${profile.bastion_port}`}
            mono
          />
          {profile.identity_file && (
            <DetailRow
              icon={<Key size={14} />}
              label="SSH Key"
              value={profile.identity_file}
              mono
            />
          )}
          <DetailRow
            icon={<RefreshCw size={14} />}
            label="Auto-reconnect"
            value={profile.auto_reconnect ? "Enabled" : "Disabled"}
          />
          {profile.jump_hosts.length > 0 && (
            <div className="flex items-start gap-3">
              <Globe size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-xs text-text-muted">Jump Hosts</span>
                <div className="mt-1 space-y-1">
                  {profile.jump_hosts.map((jh, i) => (
                    <span key={i} className="block text-sm font-mono text-purple-400">
                      {jh.user}@{jh.host}:{jh.port}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {tunnelState?.error && (
        <div className="p-4 rounded-xl bg-status-error-bg border border-status-error/20 flex items-start gap-3">
          <AlertCircle size={16} className="text-status-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-status-error mb-1">Connection Error</p>
            <p className="text-xs font-mono text-text-secondary leading-relaxed">
              {tunnelState.error}
            </p>
          </div>
        </div>
      )}

      {/* Connect / Disconnect */}
      <div>
        {isConnected ? (
          <button
            onClick={() => onDisconnect(profile.id)}
            className="focus-ring inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-status-error/15 text-status-error hover:bg-status-error/25 border border-status-error/20 text-sm font-medium cursor-pointer transition-colors duration-150"
          >
            <Square size={14} />
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => onConnect(profile.id)}
            disabled={isActive}
            className="focus-ring inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-status-connected/15 text-status-connected hover:bg-status-connected/25 border border-status-connected/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium cursor-pointer transition-colors duration-150"
          >
            <Play size={14} />
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-text-muted flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1 flex items-center justify-between gap-4">
        <span className="text-xs text-text-muted flex-shrink-0">{label}</span>
        <span
          className={`text-sm text-text-secondary truncate ${mono ? "font-mono" : ""}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
