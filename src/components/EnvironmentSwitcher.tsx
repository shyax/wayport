import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Zap } from "lucide-react";
import { useEnvironmentStore } from "../stores/environmentStore";

export function EnvironmentSwitcher() {
  const {
    environments,
    activeEnvironmentId,
    switchEnvironment,
    createEnvironment,
  } = useEnvironmentStore();

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const active = environments.find((e) => e.id === activeEnvironmentId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const env = await createEnvironment("local", newName.trim());
    switchEnvironment(env.id);
    setNewName("");
    setCreating(false);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="focus-ring w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border hover:bg-surface-hover cursor-pointer transition-colors duration-150"
      >
        <Zap size={11} className="text-accent flex-shrink-0" />
        <span className="text-text-secondary truncate flex-1 text-left">
          {active?.name ?? "No Environment"}
        </span>
        <ChevronDown size={11} className="text-text-muted flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-bg-elevated border border-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
          <div className="px-3 py-1.5">
            <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
              Environments
            </span>
          </div>

          <button
            onClick={() => {
              switchEnvironment(null as unknown as string);
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors duration-150 ${
              !activeEnvironmentId
                ? "text-accent bg-accent/5"
                : "text-text-secondary hover:bg-surface-hover"
            }`}
          >
            None (no variable substitution)
          </button>

          {environments.map((env) => (
            <button
              key={env.id}
              onClick={() => {
                switchEnvironment(env.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors duration-150 flex items-center justify-between ${
                env.id === activeEnvironmentId
                  ? "text-accent bg-accent/5"
                  : "text-text-secondary hover:bg-surface-hover"
              }`}
            >
              <span>{env.name}</span>
              <span className="text-[10px] text-text-muted">
                {Object.keys(env.variables).length} vars
              </span>
            </button>
          ))}

          <div className="border-t border-border mt-1 pt-1">
            {creating ? (
              <div className="px-3 py-1.5">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setCreating(false);
                  }}
                  placeholder="Environment name"
                  className="w-full px-2 py-1 bg-surface border border-border rounded text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-left px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors duration-150 flex items-center gap-1.5"
              >
                <Plus size={11} />
                New Environment
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
