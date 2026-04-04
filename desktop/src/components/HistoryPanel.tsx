import { useEffect, useState } from "react";
import {
  Play,
  Square,
  AlertCircle,
  RefreshCw,
  Clock,
  Terminal,
  Monitor,
} from "lucide-react";
import { useHistoryStore } from "../stores/historyStore";
import type { ActionSource } from "../lib/types";

const ACTION_CONFIG: Record<
  string,
  { icon: typeof Play; color: string; label: string }
> = {
  connect: { icon: Play, color: "text-status-connected", label: "Connected" },
  disconnect: { icon: Square, color: "text-text-muted", label: "Disconnected" },
  error: { icon: AlertCircle, color: "text-status-error", label: "Error" },
  reconnect: {
    icon: RefreshCw,
    color: "text-status-reconnecting",
    label: "Reconnected",
  },
};

const SOURCE_CONFIG: Record<ActionSource, { icon: typeof Terminal; label: string; color: string }> = {
  cli: { icon: Terminal, label: "CLI", color: "text-accent bg-accent/10 border-accent/20" },
  gui: { icon: Monitor, label: "Desktop", color: "text-text-muted bg-surface border-border" },
  api: { icon: RefreshCw, label: "API", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
};

type SourceFilter = "all" | ActionSource;

export function HistoryPanel({ workspaceId }: { workspaceId: string }) {
  const { entries, isLoading, loadHistory } = useHistoryStore();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  useEffect(() => {
    loadHistory(workspaceId);
  }, [workspaceId, loadHistory]);

  const filteredEntries = sourceFilter === "all"
    ? entries
    : entries.filter((e) => e.source === sourceFilter);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const filters: { id: SourceFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "gui", label: "Desktop" },
    { id: "cli", label: "CLI" },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        {/* Source filter */}
        <div className="flex gap-1 bg-surface p-0.5 rounded-md border border-border">
          {filters.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSourceFilter(id)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                sourceFilter === id
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => loadHistory(workspaceId)}
          className="focus-ring p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors duration-150"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <Clock size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            {sourceFilter !== "all"
              ? `No ${sourceFilter.toUpperCase()} history entries`
              : "No connection history yet. Start a tunnel to see events here."}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredEntries.map((entry) => {
            const config = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.connect;
            const Icon = config.icon;
            const source = SOURCE_CONFIG[entry.source ?? "gui"];
            const SourceIcon = source.icon;
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors duration-150"
              >
                <Icon size={14} className={`${config.color} flex-shrink-0`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {entry.profile_name}
                    </span>
                    <span className={`text-[11px] font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    {/* Source badge */}
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${source.color}`}>
                      <SourceIcon size={9} />
                      {source.label}
                    </span>
                  </div>
                  {entry.details && (
                    <p className="text-[11px] text-text-muted font-mono truncate mt-0.5">
                      {entry.details}
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-text-muted flex-shrink-0">
                  {formatTime(entry.created_at)}
                </span>
                {entry.duration_secs != null && (
                  <span className="text-[11px] text-text-muted flex-shrink-0">
                    {entry.duration_secs}s
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
