import { Circle } from "lucide-react";
import type { ConnectionProfile, TunnelState } from "../lib/types";

interface ConnectionItemProps {
  profile: ConnectionProfile;
  tunnelState?: TunnelState;
  isSelected: boolean;
  onSelect: () => void;
}

export function ConnectionItem({
  profile,
  tunnelState,
  isSelected,
  onSelect,
}: ConnectionItemProps) {
  const status = tunnelState?.status ?? "disconnected";
  const statusColors = {
    disconnected: "text-slate-500",
    connecting: "text-yellow-500 animate-pulse",
    connected: "text-green-500",
    reconnecting: "text-orange-500 animate-pulse",
    error: "text-red-500",
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 transition ${
        isSelected
          ? "bg-slate-800 border-l-2 border-blue-500"
          : "hover:bg-slate-800/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Circle size={8} className={statusColors[status]} fill="currentColor" />
        <span className="font-medium text-sm">{profile.name}</span>
      </div>
      <div className="text-xs text-slate-400 ml-5">
        {profile.local_port} → {profile.remote_host}:{profile.remote_port}
      </div>
    </button>
  );
}
