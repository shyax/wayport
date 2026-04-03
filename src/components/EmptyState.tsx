import { Plus } from "lucide-react";

interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="max-w-md">
        <div className="bg-slate-800 rounded-lg p-8 mb-6">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-2">No connections yet</h2>
          <p className="text-slate-400 mb-6">
            Create your first SSH tunnel connection to get started. Save your
            connection details, connect with one click, and manage multiple
            tunnels easily.
          </p>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
          >
            <Plus size={20} />
            New Connection
          </button>
        </div>
      </div>
    </div>
  );
}
