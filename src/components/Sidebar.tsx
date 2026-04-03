import { Plus, Download, Upload } from "lucide-react";
import { ConnectionItem } from "./ConnectionItem";
import type { ConnectionProfile, TunnelState } from "../lib/types";

interface SidebarProps {
  profiles: ConnectionProfile[];
  tunnelStates: Record<string, TunnelState>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onImport: () => void;
  onExport: () => void;
}

export function Sidebar({
  profiles,
  tunnelStates,
  selectedId,
  onSelect,
  onAdd,
  onImport,
  onExport,
}: SidebarProps) {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Connections</h1>
        <div className="flex gap-2">
          <button
            onClick={onImport}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
            title="Import"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onExport}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
            title="Export"
          >
            <Upload size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {profiles.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            No connections yet
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {profiles.map((profile) => (
              <ConnectionItem
                key={profile.id}
                profile={profile}
                tunnelState={tunnelStates[profile.id]}
                isSelected={profile.id === selectedId}
                onSelect={() => onSelect(profile.id)}
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onAdd}
        className="m-4 flex items-center justify-center gap-2 w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
      >
        <Plus size={18} />
        New Connection
      </button>
    </div>
  );
}
