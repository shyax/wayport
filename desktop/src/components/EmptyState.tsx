import { Plus, Cable, FileCode2, ArrowRight } from "lucide-react";

interface EmptyStateProps {
  onAdd: () => void;
  onImportSshConfig?: () => void;
}

export function EmptyState({ onAdd, onImportSshConfig }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-5 animate-glow">
          <Cable size={28} className="text-accent" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Welcome to Wayport
        </h2>
        <p className="text-sm text-text-muted leading-relaxed mb-8">
          Manage SSH tunnels with saved profiles, one-click connect, and auto-reconnect.
        </p>

        <div className="flex flex-col gap-3 items-center">
          {onImportSshConfig && (
            <button
              onClick={onImportSshConfig}
              className="focus-ring w-full max-w-xs flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-accent/30 hover:bg-surface-hover cursor-pointer transition-all duration-150 text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                <FileCode2 size={18} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-text-primary block">
                  Import from SSH config
                </span>
                <span className="text-[11px] text-text-muted block mt-0.5">
                  Auto-detect hosts from ~/.ssh/config
                </span>
              </div>
              <ArrowRight size={14} className="text-text-muted group-hover:text-accent transition-colors flex-shrink-0" />
            </button>
          )}

          <button
            onClick={onAdd}
            className="focus-ring w-full max-w-xs flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-accent/30 hover:bg-surface-hover cursor-pointer transition-all duration-150 text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center flex-shrink-0">
              <Plus size={18} className="text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-text-primary block">
                Create a connection
              </span>
              <span className="text-[11px] text-text-muted block mt-0.5">
                Set up a new SSH tunnel manually
              </span>
            </div>
            <ArrowRight size={14} className="text-text-muted group-hover:text-accent transition-colors flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
