import type { ConnectionProfile, TunnelState, TunnelStatus } from "../lib/types";

interface ConnectionItemProps {
  profile: ConnectionProfile;
  tunnelState?: TunnelState;
  isSelected: boolean;
  onSelect: () => void;
}

const statusConfig: Record<TunnelStatus, { dot: string; animation: string }> = {
  disconnected: { dot: "bg-status-disconnected", animation: "" },
  connecting: { dot: "bg-status-connecting", animation: "animate-status-pulse" },
  connected: { dot: "bg-status-connected", animation: "" },
  reconnecting: { dot: "bg-status-reconnecting", animation: "animate-status-pulse" },
  error: { dot: "bg-status-error", animation: "" },
};

const TYPE_BADGE: Record<string, { letter: string; color: string }> = {
  local: { letter: "L", color: "text-accent bg-accent/10" },
  remote: { letter: "R", color: "text-purple-400 bg-purple-500/10" },
  dynamic: { letter: "D", color: "text-status-connecting bg-status-connecting/10" },
};

function formatSubtitle(profile: ConnectionProfile): string {
  switch (profile.forwarding_type) {
    case "dynamic":
      return `SOCKS :${profile.local_port}`;
    case "remote":
      return `:${profile.local_port} \u2190 ${profile.remote_host ?? "localhost"}:${profile.remote_port ?? ""}`;
    case "local":
    default:
      return `:${profile.local_port} \u2192 ${profile.remote_host ?? ""}:${profile.remote_port ?? ""}`;
  }
}

export function ConnectionItem({
  profile,
  tunnelState,
  isSelected,
  onSelect,
}: ConnectionItemProps) {
  const status = tunnelState?.status ?? "disconnected";
  const { dot, animation } = statusConfig[status];
  const badge = TYPE_BADGE[profile.forwarding_type] ?? TYPE_BADGE.local;

  return (
    <button
      onClick={onSelect}
      className={`focus-ring w-full text-left px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group ${
        isSelected
          ? "bg-accent/12 border border-accent/25"
          : "border border-transparent hover:bg-surface-hover"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${dot} ${animation}`} />
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={`block text-[13px] font-medium truncate transition-colors duration-150 ${
              isSelected ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary"
            }`}
          >
            {profile.name}
          </span>
          <span className="block text-[11px] font-mono text-text-muted truncate mt-0.5">
            {formatSubtitle(profile)}
          </span>
        </div>
        <span
          className={`text-[10px] font-mono font-semibold w-5 h-5 flex items-center justify-center rounded ${badge.color} flex-shrink-0`}
        >
          {badge.letter}
        </span>
      </div>
    </button>
  );
}
