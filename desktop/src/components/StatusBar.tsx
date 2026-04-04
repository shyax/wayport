import type { ConnectionProfile, TunnelState } from "../lib/types";

interface StatusBarProps {
  activeCount: number;
  totalCount: number;
  profiles: ConnectionProfile[];
  tunnelStates: Record<string, TunnelState>;
}

export function StatusBar({ activeCount, totalCount, profiles, tunnelStates }: StatusBarProps) {
  const activeTunnels = profiles.filter(
    (p) => tunnelStates[p.id]?.status === "connected",
  );

  return (
    <div className="border-t border-border bg-rail px-4 py-1.5 text-[11px] text-text-muted flex items-center gap-3 min-h-[28px]">
      <span className="flex-shrink-0 flex items-center gap-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeCount > 0 ? "bg-status-connected" : "bg-status-disconnected"}`}
        />
        <span className={activeCount > 0 ? "text-status-connected font-medium" : ""}>
          {totalCount === 0 ? "No connections" : `${activeCount} / ${totalCount} active`}
        </span>
      </span>

      {activeTunnels.length > 0 && (
        <>
          <span className="text-border">|</span>
          <div className="flex gap-1.5 overflow-x-auto flex-1">
            {activeTunnels.map((p) => (
              <span
                key={p.id}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-status-connected/10 border border-status-connected/20 text-status-connected font-mono"
              >
                <span className="w-1 h-1 rounded-full bg-status-connected" />
                {p.name}
                <span className="text-status-connected/60">:{p.local_port}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
