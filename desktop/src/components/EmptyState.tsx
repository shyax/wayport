import { Plus, Cable } from "lucide-react";

interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-5 animate-glow">
          <Cable size={28} className="text-accent" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          No connections yet
        </h2>
        <p className="text-sm text-text-muted leading-relaxed mb-6">
          Create your first SSH tunnel to get started. Save connection
          profiles, connect with one click, and manage multiple tunnels.
        </p>
        <button
          onClick={onAdd}
          className="focus-ring inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-bg rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-150"
        >
          <Plus size={16} />
          New Connection
        </button>
      </div>
    </div>
  );
}
