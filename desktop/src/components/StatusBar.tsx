import { Cloud, CloudOff } from "lucide-react";
import type { ConnectionProfile, TunnelState } from "../lib/types";
import { ENV_COLORS } from "../lib/types";
import { useEnvironmentStore } from "../stores/environmentStore";
import { useAuthStore } from "../stores/authStore";
import { isCloudEnabled } from "../lib/auth";

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

  const { environments, activeEnvironmentId } = useEnvironmentStore();
  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
  const envColor = activeEnv
    ? activeEnv.color ?? ENV_COLORS[activeEnv.name.toLowerCase()]?.hex ?? ENV_COLORS.custom.hex
    : null;

  const { mode: authMode, email } = useAuthStore();

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

      {activeEnv && (
        <>
          <span className="text-border">|</span>
          <span className="flex-shrink-0 flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: envColor! }}
            />
            <span style={{ color: envColor! }} className="font-medium">
              {activeEnv.name}
            </span>
          </span>
        </>
      )}

      {activeTunnels.length > 0 && (
        <>
          <span className="text-border">|</span>
          <div className="flex gap-1.5 overflow-hidden flex-1 min-w-0">
            {activeTunnels.slice(0, 4).map((p) => (
              <span
                key={p.id}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-status-connected/10 border border-status-connected/20 text-status-connected font-mono truncate max-w-[160px]"
                title={`${p.name} :${p.local_port}`}
              >
                <span className="w-1 h-1 rounded-full bg-status-connected flex-shrink-0" />
                <span className="truncate">{p.name}</span>
                <span className="text-status-connected/60 flex-shrink-0">:{p.local_port}</span>
              </span>
            ))}
            {activeTunnels.length > 4 && (
              <span className="flex-shrink-0 px-2 py-0.5 rounded bg-surface text-text-muted font-mono">
                +{activeTunnels.length - 4} more
              </span>
            )}
          </div>
        </>
      )}

      {/* Cloud sync indicator */}
      {isCloudEnabled && (
        <>
          <div className="flex-1" />
          <span
            className="flex-shrink-0 flex items-center gap-1.5"
            title={authMode === "authenticated" ? `Synced as ${email ?? "unknown"}` : "Offline — not syncing"}
          >
            {authMode === "authenticated" ? (
              <>
                <Cloud size={11} className="text-accent" />
                <span className="text-accent font-medium">Synced</span>
              </>
            ) : (
              <>
                <CloudOff size={11} />
                <span>Offline</span>
              </>
            )}
          </span>
        </>
      )}
    </div>
  );
}
