import { useState, useRef, useEffect } from "react";
import { Edit2, Copy, Trash2, Play, Square, Pin } from "lucide-react";
import type { ConnectionProfile, TunnelState, TunnelStatus } from "../lib/types";

interface ConnectionItemProps {
  profile: ConnectionProfile;
  tunnelState?: TunnelState;
  isSelected: boolean;
  onSelect: () => void;
  onConnect?: (id: string) => void;
  onDisconnect?: (id: string) => void;
  onEdit?: (profile: ConnectionProfile) => void;
  onDuplicate?: (profile: ConnectionProfile) => void;
  onDelete?: (id: string) => void;
  onTogglePin?: (id: string) => void;
}

const statusConfig: Record<TunnelStatus, { dot: string; animation: string }> = {
  disconnected: { dot: "bg-status-disconnected", animation: "" },
  connecting: { dot: "bg-status-connecting", animation: "animate-status-pulse" },
  connected: { dot: "bg-status-connected", animation: "" },
  reconnecting: { dot: "bg-status-reconnecting", animation: "animate-status-pulse" },
  error: { dot: "bg-status-error", animation: "" },
};

const TYPE_BADGE: Record<string, { letter: string; title: string; color: string }> = {
  local: { letter: "L", title: "Local forward (-L)", color: "text-accent bg-accent/10" },
  remote: { letter: "R", title: "Remote forward (-R)", color: "text-purple-400 bg-purple-500/10" },
  dynamic: { letter: "D", title: "SOCKS proxy (-D)", color: "text-status-connecting bg-status-connecting/10" },
  kubernetes: { letter: "K", title: "Kubernetes port-forward", color: "text-blue-400 bg-blue-500/10" },
};

function formatSubtitle(profile: ConnectionProfile): string {
  switch (profile.forwarding_type) {
    case "dynamic":
      return `SOCKS :${profile.local_port}`;
    case "remote":
      return `:${profile.local_port} \u2190 ${profile.remote_host ?? "localhost"}:${profile.remote_port ?? ""}`;
    case "kubernetes":
      return `:${profile.local_port} \u2192 ${profile.k8s_resource ?? "pod"}:${profile.k8s_resource_port ?? ""}`;
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
  onConnect,
  onDisconnect,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePin,
}: ConnectionItemProps) {
  const status = tunnelState?.status ?? "disconnected";
  const { dot, animation } = statusConfig[status];
  const badge = TYPE_BADGE[profile.forwarding_type] ?? TYPE_BADGE.local;
  const isConnected = status === "connected";
  const canConnect = status === "disconnected" || status === "error";

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  const handleDoubleClick = () => {
    if (canConnect && onConnect) {
      onConnect(profile.id);
    } else if (isConnected && onDisconnect) {
      onDisconnect(profile.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <button
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
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
            title={badge.title}
          >
            {badge.letter}
          </span>
        </div>
      </button>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-[100] w-48 bg-bg-elevated border border-border rounded-lg shadow-xl py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {canConnect && onConnect && (
            <ContextMenuItem
              icon={<Play size={13} />}
              label="Connect"
              onClick={() => { onConnect(profile.id); setContextMenu(null); }}
            />
          )}
          {isConnected && onDisconnect && (
            <ContextMenuItem
              icon={<Square size={13} />}
              label="Disconnect"
              onClick={() => { onDisconnect(profile.id); setContextMenu(null); }}
              destructive
            />
          )}
          {(canConnect || isConnected) && <div className="border-t border-border my-1" />}
          {onTogglePin && (
            <ContextMenuItem
              icon={<Pin size={13} className={profile.is_pinned ? "fill-current" : ""} />}
              label={profile.is_pinned ? "Unpin" : "Pin"}
              onClick={() => { onTogglePin(profile.id); setContextMenu(null); }}
            />
          )}
          {onEdit && (
            <ContextMenuItem
              icon={<Edit2 size={13} />}
              label="Edit"
              onClick={() => { onEdit(profile); setContextMenu(null); }}
            />
          )}
          {onDuplicate && (
            <ContextMenuItem
              icon={<Copy size={13} />}
              label="Duplicate"
              onClick={() => { onDuplicate(profile); setContextMenu(null); }}
            />
          )}
          {onDelete && (
            <>
              <div className="border-t border-border my-1" />
              <ContextMenuItem
                icon={<Trash2 size={13} />}
                label="Delete"
                onClick={() => { onDelete(profile.id); setContextMenu(null); }}
                destructive
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

function ContextMenuItem({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer transition-colors text-left ${
        destructive
          ? "text-status-error hover:bg-status-error/10"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
