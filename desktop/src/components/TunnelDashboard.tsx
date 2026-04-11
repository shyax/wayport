import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import type { ConnectionProfile, TunnelState } from "../lib/types";
import { useEnvironmentStore } from "../stores/environmentStore";
import { ENV_COLORS } from "../lib/types";

interface TunnelDashboardProps {
  profiles: ConnectionProfile[];
  tunnelStates: Record<string, TunnelState>;
  onSelect: (id: string) => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}

function formatUptime(connectedSince: string | null): string {
  if (!connectedSince) return "";
  const ms = Date.now() - new Date(connectedSince).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-bg-elevated border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className="text-[11px] text-text-muted uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <span className="text-2xl font-semibold text-text-primary tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function TunnelDashboard({
  profiles,
  tunnelStates,
  onSelect,
  onConnect,
  onDisconnect,
}: TunnelDashboardProps) {
  const activeTunnels = profiles.filter(
    (p) => tunnelStates[p.id]?.status === "connected",
  );
  const errorTunnels = profiles.filter(
    (p) => tunnelStates[p.id]?.status === "error",
  );
  const connectingTunnels = profiles.filter(
    (p) =>
      tunnelStates[p.id]?.status === "connecting" ||
      tunnelStates[p.id]?.status === "reconnecting",
  );

  const localForwards = activeTunnels.filter(
    (p) => p.forwarding_type === "local",
  );
  const remoteForwards = activeTunnels.filter(
    (p) => p.forwarding_type === "remote",
  );

  const { environments, activeEnvironmentId } = useEnvironmentStore();
  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
  const envColor = activeEnv
    ? activeEnv.color ?? ENV_COLORS[activeEnv.name.toLowerCase()]?.hex ?? ENV_COLORS.custom.hex
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-text-primary">
            Tunnel Dashboard
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {activeTunnels.length === 0
              ? "No active tunnels"
              : `${activeTunnels.length} tunnel${activeTunnels.length !== 1 ? "s" : ""} active`}
          </p>
        </div>
        {activeEnv && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg-elevated">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: envColor! }}
            />
            <span className="text-xs font-medium" style={{ color: envColor! }}>
              {activeEnv.name}
            </span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Active"
          value={activeTunnels.length}
          icon={Wifi}
          color="text-status-connected"
        />
        <StatCard
          label="Total"
          value={profiles.length}
          icon={Activity}
          color="text-accent"
        />
        <StatCard
          label="Local"
          value={localForwards.length}
          icon={ArrowDownRight}
          color="text-teal-400"
        />
        <StatCard
          label="Remote"
          value={remoteForwards.length}
          icon={ArrowUpRight}
          color="text-purple-400"
        />
      </div>

      {/* Active Tunnels */}
      {activeTunnels.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-surface border-b border-border">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Active Tunnels
            </span>
          </div>
          <div className="divide-y divide-border">
            {activeTunnels.map((p) => {
              const state = tunnelStates[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-status-connected flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text-primary block truncate">
                      {p.name}
                    </span>
                    <span className="text-[11px] font-mono text-text-muted block mt-0.5">
                      :{p.local_port} &rarr; {p.remote_host ?? "localhost"}:{p.remote_port ?? ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-muted flex-shrink-0">
                    <Clock size={11} />
                    <span className="text-[11px] font-mono tabular-nums">
                      {formatUptime(state?.connected_since ?? null)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDisconnect(p.id);
                    }}
                    className="p-1 rounded text-text-muted hover:text-status-error transition-colors cursor-pointer"
                    title="Disconnect"
                  >
                    <WifiOff size={13} />
                  </button>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Connecting / Reconnecting */}
      {connectingTunnels.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-surface border-b border-border">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Connecting
            </span>
          </div>
          <div className="divide-y divide-border">
            {connectingTunnels.map((p) => {
              const state = tunnelStates[p.id];
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="w-2 h-2 rounded-full bg-status-connecting animate-pulse flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text-secondary block truncate">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-status-connecting">
                    {state?.status === "reconnecting"
                      ? `Reconnecting (attempt ${state.reconnect_attempt})`
                      : "Connecting..."}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Errors */}
      {errorTunnels.length > 0 && (
        <div className="rounded-xl border border-status-error/20 overflow-hidden">
          <div className="px-4 py-2.5 bg-status-error/5 border-b border-status-error/20">
            <span className="text-xs font-medium text-status-error uppercase tracking-wider">
              Errors
            </span>
          </div>
          <div className="divide-y divide-border">
            {errorTunnels.map((p) => {
              const state = tunnelStates[p.id];
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="w-2 h-2 rounded-full bg-status-error flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text-secondary block truncate">
                      {p.name}
                    </span>
                    <span className="text-[11px] text-status-error block mt-0.5 truncate">
                      {state?.error ?? "Connection failed"}
                    </span>
                  </div>
                  <button
                    onClick={() => onConnect(p.id)}
                    className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Zap size={11} />
                    Retry
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions — shown when no tunnels are active */}
      {activeTunnels.length === 0 && profiles.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-surface border-b border-border">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Quick Connect
            </span>
          </div>
          <div className="divide-y divide-border">
            {profiles.slice(0, 5).map((p) => (
              <button
                key={p.id}
                onClick={() => onConnect(p.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left cursor-pointer group"
              >
                <div className="w-2 h-2 rounded-full bg-status-disconnected flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary block truncate transition-colors">
                    {p.name}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted block mt-0.5">
                    :{p.local_port} &rarr; {p.remote_host ?? "localhost"}:{p.remote_port ?? ""}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  Connect
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
