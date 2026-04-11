import { useState, useEffect, useCallback } from "react";
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
  Copy,
  Tag,
  Terminal,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
} from "lucide-react";
import * as api from "../lib/api";
import type { ConnectionProfile, TunnelState, TunnelStats, TunnelStatus } from "../lib/types";

interface ConnectionDetailProps {
  profile: ConnectionProfile;
  tunnelState?: TunnelState;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onDuplicate?: (profile: ConnectionProfile) => void;
}

const STATUS_CONFIG: Record<
  TunnelStatus,
  { label: string; color: string; bg: string; icon: React.ElementType; spin?: boolean }
> = {
  disconnected: {
    label: "Disconnected",
    color: "text-status-disconnected",
    bg: "bg-surface",
    icon: MinusCircle,
  },
  connecting: {
    label: "Connecting",
    color: "text-status-connecting",
    bg: "bg-status-connecting-bg",
    icon: Loader2,
    spin: true,
  },
  connected: {
    label: "Connected",
    color: "text-status-connected",
    bg: "bg-status-connected-bg",
    icon: CheckCircle2,
  },
  reconnecting: {
    label: "Reconnecting",
    color: "text-status-reconnecting",
    bg: "bg-status-reconnecting-bg",
    icon: RefreshCw,
    spin: true,
  },
  error: {
    label: "Error",
    color: "text-status-error",
    bg: "bg-status-error-bg",
    icon: XCircle,
  },
};

const TYPE_CONFIG: Record<string, { label: string; flag: string; color: string }> = {
  local: { label: "Local Forward", flag: "-L", color: "text-accent bg-accent/10 border-accent/20" },
  remote: { label: "Remote Forward", flag: "-R", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  dynamic: { label: "SOCKS Proxy", flag: "-D", color: "text-status-connecting bg-status-connecting/10 border-status-connecting/20" },
  kubernetes: { label: "K8s Port-Forward", flag: "kubectl", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
};

function formatUptime(connectedSince: string | null): string {
  if (!connectedSince) return "";
  const ms = Date.now() - new Date(connectedSince).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatUptimeSecs(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${secs}s`;
}

function ForwardingDiagram({ profile }: { profile: ConnectionProfile }) {
  if (profile.forwarding_type === "kubernetes") {
    return (
      <div className="flex items-center gap-3 font-mono text-sm">
        <div className="px-3 py-2 rounded-lg bg-surface border border-border">
          <span className="text-text-muted text-xs block">Local</span>
          <span className="text-accent">localhost:{profile.local_port}</span>
        </div>
        <ArrowRight size={16} className="text-text-muted flex-shrink-0" />
        <div className="px-3 py-2 rounded-lg bg-surface border border-border">
          <span className="text-text-muted text-xs block">K8s {profile.k8s_namespace ?? "default"}</span>
          <span className="text-blue-400">{profile.k8s_resource}:{profile.k8s_resource_port}</span>
        </div>
      </div>
    );
  }

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
  onDuplicate,
}: ConnectionDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [stats, setStats] = useState<TunnelStats | null>(null);
  const status = tunnelState?.status ?? "disconnected";
  const isConnected = status === "connected";

  useEffect(() => {
    if (!isConnected) {
      setStats(null);
      return;
    }
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const allStats = await api.getTunnelStats();
        if (!cancelled) {
          const s = allStats.find((s) => s.profile_id === profile.id) ?? null;
          setStats(s);
        }
      } catch {
        // ignore
      }
    };
    // Fetch immediately then poll — setTimeout avoids synchronous setState in effect
    const initial = setTimeout(fetchStats, 0);
    const interval = setInterval(fetchStats, 5000);
    return () => { cancelled = true; clearTimeout(initial); clearInterval(interval); };
  }, [isConnected, profile.id]);
  const isActive = status === "connecting" || status === "reconnecting";
  const statusInfo = STATUS_CONFIG[status];
  const StatusIcon = statusInfo.icon;
  const typeInfo = TYPE_CONFIG[profile.forwarding_type] ?? TYPE_CONFIG.local;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
            <StatusIcon
              size={14}
              className={`${statusInfo.color} ${statusInfo.spin ? "animate-spin" : ""}`}
            />
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

        {/* Action buttons — connect/disconnect lives here */}
        <div className="flex gap-2">
          {isConnected ? (
            <button
              onClick={() => onDisconnect(profile.id)}
              className="focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-error/15 text-status-error hover:bg-status-error/25 border border-status-error/20 text-sm font-medium cursor-pointer transition-colors duration-150"
            >
              <Square size={13} />
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => onConnect(profile.id)}
              disabled={isActive}
              className="focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-connected/15 text-status-connected hover:bg-status-connected/25 border border-status-connected/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium cursor-pointer transition-colors duration-150"
            >
              {isActive ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Play size={13} />
              )}
              {isActive ? (status === "reconnecting" ? "Reconnecting…" : "Connecting…") : "Connect"}
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={() => onDuplicate(profile)}
              className="focus-ring p-2 rounded-lg border border-border text-text-secondary hover:text-accent hover:border-accent/30 cursor-pointer transition-colors duration-150"
              title="Duplicate"
              aria-label="Duplicate connection"
            >
              <Copy size={15} />
            </button>
          )}
          <button
            onClick={() => api.openTerminal(profile.id)}
            className="focus-ring p-2 rounded-lg border border-border text-text-secondary hover:text-accent hover:border-accent/30 cursor-pointer transition-colors duration-150"
            title="Open Terminal"
            aria-label="Open terminal session"
          >
            <Terminal size={15} />
          </button>
          <button
            onClick={onEdit}
            className="focus-ring p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-colors duration-150"
            title="Edit"
            aria-label="Edit connection"
          >
            <Edit2 size={15} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete(profile.id)}
                className="focus-ring px-2 py-1 rounded-lg bg-status-error/15 text-status-error hover:bg-status-error/25 border border-status-error/20 text-xs font-medium cursor-pointer transition-colors duration-150"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="focus-ring px-2 py-1 rounded-lg border border-border text-text-muted hover:text-text-secondary text-xs cursor-pointer transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="focus-ring p-2 rounded-lg border border-border text-text-secondary hover:text-status-error hover:border-status-error/30 cursor-pointer transition-colors duration-150"
              title="Delete"
              aria-label="Delete connection"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Tags */}
      {profile.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={12} className="text-text-muted" />
          {profile.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Port Forwarding Diagram */}
      <div className="p-4 rounded-xl bg-bg-elevated border border-border">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
          Port Forwarding
        </p>
        <ForwardingDiagram profile={profile} />
      </div>

      {/* Traffic Stats */}
      {isConnected && stats && (
        <div className="p-4 rounded-xl bg-bg-elevated border border-border">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
            Traffic
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="block text-xs text-text-muted">Active</span>
              <span className="text-lg font-semibold text-text-primary tabular-nums">
                {stats.active_connections}
              </span>
              <span className="text-xs text-text-muted ml-1">conn{stats.active_connections !== 1 ? "s" : ""}</span>
            </div>
            <div>
              <span className="block text-xs text-text-muted">Total</span>
              <span className="text-lg font-semibold text-text-primary tabular-nums">
                {stats.total_connections}
              </span>
              <span className="text-xs text-text-muted ml-1">conn{stats.total_connections !== 1 ? "s" : ""}</span>
            </div>
            <div>
              <span className="block text-xs text-text-muted">Uptime</span>
              <span className="text-lg font-semibold text-text-primary tabular-nums">
                {formatUptimeSecs(stats.uptime_secs)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Connection Details */}
      <div className="p-4 rounded-xl bg-bg-elevated border border-border">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
          {profile.forwarding_type === "kubernetes" ? "Kubernetes" : "Connection"}
        </p>
        <div className="space-y-3">
          {profile.forwarding_type === "kubernetes" ? (
            <>
              {profile.k8s_context && (
                <DetailRow icon={<Server size={14} />} label="Context" value={profile.k8s_context} mono />
              )}
              <DetailRow
                icon={<Globe size={14} />}
                label="Namespace"
                value={profile.k8s_namespace ?? "default"}
                mono
              />
              <DetailRow
                icon={<Server size={14} />}
                label="Resource"
                value={profile.k8s_resource ?? ""}
                mono
              />
            </>
          ) : (
            <>
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
              {profile.jump_hosts.length > 0 && (
                <div className="flex items-start gap-3">
                  <Globe size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-text-muted">
                      Jump Hosts ({profile.jump_hosts.length} hop{profile.jump_hosts.length !== 1 ? "s" : ""})
                    </span>
                    <div className="mt-1 space-y-1">
                      {profile.jump_hosts.map((jh, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold text-accent bg-accent/10 w-4 h-4 flex items-center justify-center rounded flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-sm font-mono text-purple-400">
                            {jh.user}@{jh.host}:{jh.port}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <DetailRow
            icon={<RefreshCw size={14} />}
            label="Auto-reconnect"
            value={profile.auto_reconnect ? "Enabled" : "Disabled"}
          />
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

      {/* SSH Logs */}
      {(isConnected || status === "error") && (
        <LogsPanel profileId={profile.id} />
      )}

    </div>
  );
}

function LogsPanel({ profileId }: { profileId: string }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await api.getTunnelLogs(profileId);
      setLogs(data);
    } catch {
      // No logs available
    }
  }, [profileId]);

  useEffect(() => {
    if (expanded) {
      const initial = setTimeout(fetchLogs, 0);
      const interval = setInterval(fetchLogs, 3000);
      return () => { clearTimeout(initial); clearInterval(interval); };
    }
  }, [expanded, fetchLogs]);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-surface hover:bg-surface-hover cursor-pointer transition-colors text-left"
      >
        <Terminal size={14} className="text-text-muted" />
        <span className="text-xs font-medium text-text-secondary flex-1">SSH Logs</span>
        {expanded ? (
          <ChevronDown size={14} className="text-text-muted" />
        ) : (
          <ChevronRight size={14} className="text-text-muted" />
        )}
      </button>
      {expanded && (
        <div className="max-h-48 overflow-y-auto bg-[#0a0a0a] p-3">
          {logs.length === 0 ? (
            <p className="text-[11px] text-text-muted font-mono">No log output</p>
          ) : (
            <pre className="text-[11px] text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
              {logs.join("\n")}
            </pre>
          )}
        </div>
      )}
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
