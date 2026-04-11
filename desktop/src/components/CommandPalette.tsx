import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Cable, Wrench, Clock, Zap, Settings, Key, Play, Square, Layers } from "lucide-react";
import type { ConnectionProfile, TunnelState } from "../lib/types";
import type { SidebarView } from "./Sidebar";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  profiles: ConnectionProfile[];
  tunnelStates: Record<string, TunnelState>;
  onSelectProfile: (id: string) => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onSwitchView: (view: SidebarView) => void;
  onNewConnection: () => void;
}

interface CommandItem {
  id: string;
  type: "profile" | "action" | "view";
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  status?: string;
  onSelect: () => void;
}

const VIEW_COMMANDS: { id: SidebarView; label: string; icon: React.ReactNode }[] = [
  { id: "connections", label: "Go to Connections", icon: <Cable size={14} /> },
  { id: "groups", label: "Go to Groups", icon: <Layers size={14} /> },
  { id: "port-tools", label: "Go to Port Tools", icon: <Wrench size={14} /> },
  { id: "environments", label: "Go to Environments", icon: <Zap size={14} /> },
  { id: "history", label: "Go to History", icon: <Clock size={14} /> },
  { id: "ssh-keys", label: "Go to SSH Keys", icon: <Key size={14} /> },
  { id: "settings", label: "Go to Settings", icon: <Settings size={14} /> },
];

export function CommandPalette({
  open,
  onClose,
  profiles,
  tunnelStates,
  onSelectProfile,
  onConnect,
  onDisconnect,
  onSwitchView,
  onNewConnection,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items = useMemo((): CommandItem[] => {
    const q = query.toLowerCase().trim();
    const result: CommandItem[] = [];

    // Profile items
    for (const p of profiles) {
      const state = tunnelStates[p.id];
      const isConnected = state?.status === "connected";
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.bastion_host.toLowerCase().includes(q) ||
        p.ssh_user.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));

      if (!matchesQuery) continue;

      result.push({
        id: `profile-${p.id}`,
        type: "profile",
        label: p.name,
        sublabel: `:${p.local_port} → ${p.remote_host ?? ""}:${p.remote_port ?? ""}`,
        icon: isConnected ? (
          <Square size={14} className="text-status-error" />
        ) : (
          <Play size={14} className="text-status-connected" />
        ),
        status: state?.status,
        onSelect: () => {
          if (isConnected) {
            onDisconnect(p.id);
          } else {
            onConnect(p.id);
          }
          onSelectProfile(p.id);
          onClose();
        },
      });
    }

    // Action items
    if (!q || "new connection".includes(q) || "create".includes(q)) {
      result.push({
        id: "action-new",
        type: "action",
        label: "New Connection",
        sublabel: "Create a new tunnel profile",
        icon: <Cable size={14} className="text-accent" />,
        onSelect: () => {
          onNewConnection();
          onClose();
        },
      });
    }

    // View navigation items
    for (const view of VIEW_COMMANDS) {
      if (!q || view.label.toLowerCase().includes(q) || view.id.includes(q)) {
        result.push({
          id: `view-${view.id}`,
          type: "view",
          label: view.label,
          icon: view.icon,
          onSelect: () => {
            onSwitchView(view.id);
            onClose();
          },
        });
      }
    }

    return result;
  }, [query, profiles, tunnelStates, onConnect, onDisconnect, onSelectProfile, onSwitchView, onClose, onNewConnection]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        items[selectedIndex]?.onSelect();
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!open) return null;

  const STATUS_DOT: Record<string, string> = {
    connected: "bg-status-connected",
    connecting: "bg-status-connecting animate-status-pulse",
    reconnecting: "bg-status-reconnecting animate-status-pulse",
    error: "bg-status-error",
    disconnected: "bg-status-disconnected",
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-start justify-center pt-[20vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg bg-bg-elevated border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tunnels, actions, views..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
          />
          <kbd className="text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-text-muted">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={item.onSelect}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                i === selectedIndex
                  ? "bg-accent/10 text-text-primary"
                  : "text-text-secondary hover:bg-surface-hover"
              }`}
            >
              <span className="shrink-0 w-5 h-5 flex items-center justify-center text-text-muted">
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">
                  {item.label}
                </span>
                {item.sublabel && (
                  <span className="block text-xs text-text-muted font-mono truncate">
                    {item.sublabel}
                  </span>
                )}
              </div>
              {item.status && (
                <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[item.status] ?? STATUS_DOT.disconnected}`} />
              )}
              {item.type === "view" && (
                <span className="text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border font-mono shrink-0">
                  view
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <kbd className="bg-surface px-1 py-0.5 rounded border border-border font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-surface px-1 py-0.5 rounded border border-border font-mono">⏎</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-surface px-1 py-0.5 rounded border border-border font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
