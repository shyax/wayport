import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { useEnvironmentStore } from "../stores/environmentStore";
import type { Environment } from "../lib/types";

export function EnvironmentEditor() {
  const { environments, activeEnvironmentId, updateEnvironment, deleteEnvironment } =
    useEnvironmentStore();
  const [selectedEnvId, setSelectedEnvId] = useState(activeEnvironmentId);

  const env = environments.find((e) => e.id === selectedEnvId);

  return (
    <div className="max-w-3xl">
      {environments.length === 0 ? (
        <p className="text-sm text-text-muted">
          No environments yet. Create one from the environment switcher in the
          sidebar.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Tab list */}
          <div className="flex gap-1 bg-surface p-1 rounded-lg border border-border overflow-x-auto">
            {environments.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedEnvId(e.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 whitespace-nowrap ${
                  e.id === selectedEnvId
                    ? "bg-accent text-white"
                    : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {e.name}
              </button>
            ))}
          </div>

          {env && (
            <VariableEditor
              key={env.id}
              environment={env}
              onSave={updateEnvironment}
              onDelete={() => {
                deleteEnvironment(env.id);
                setSelectedEnvId(environments[0]?.id ?? null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function VariableEditor({
  environment,
  onSave,
  onDelete,
}: {
  environment: Environment;
  onSave: (env: Environment) => Promise<void>;
  onDelete: () => void;
}) {
  const [pairs, setPairs] = useState<[string, string][]>(
    Object.entries(environment.variables).length > 0
      ? Object.entries(environment.variables)
      : [["", ""]],
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const variables: Record<string, string> = {};
    for (const [k, v] of pairs) {
      if (k.trim()) variables[k.trim()] = v;
    }
    await onSave({ ...environment, variables });
    setSaving(false);
  };

  const addRow = () => setPairs([...pairs, ["", ""]]);

  const removeRow = (i: number) =>
    setPairs(pairs.filter((_, idx) => idx !== i));

  const updateRow = (i: number, col: 0 | 1, value: string) => {
    const next = [...pairs];
    next[i] = [...next[i]] as [string, string];
    next[i][col] = value;
    setPairs(next);
  };

  const inputClass =
    "w-full px-2 py-1.5 bg-surface border border-border rounded text-xs text-text-primary font-mono placeholder-text-muted focus:outline-none focus:border-accent transition-colors duration-150";

  return (
    <div className="p-4 rounded-xl bg-bg-elevated border border-border space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Variables
        </p>
        <p className="text-[10px] text-text-muted">
          Use <code className="text-accent">{`{{variable_name}}`}</code> in
          connection fields
        </p>
      </div>

      <div className="space-y-1.5">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_28px] gap-2 px-1">
          <span className="text-[10px] text-text-muted uppercase tracking-wider">
            Key
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-wider">
            Value
          </span>
          <span />
        </div>

        {pairs.map(([key, value], i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_28px] gap-2">
            <input
              type="text"
              value={key}
              onChange={(e) => updateRow(i, 0, e.target.value)}
              placeholder="key"
              className={inputClass}
            />
            <input
              type="text"
              value={value}
              onChange={(e) => updateRow(i, 1, e.target.value)}
              placeholder="value"
              className={inputClass}
            />
            <button
              onClick={() => removeRow(i)}
              className="p-1 text-text-muted hover:text-status-error cursor-pointer transition-colors duration-150"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={addRow}
          className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary cursor-pointer transition-colors duration-150"
        >
          <Plus size={11} />
          Add Variable
        </button>

        <div className="flex gap-2">
          <button
            onClick={onDelete}
            className="focus-ring px-3 py-1.5 text-xs text-status-error hover:bg-status-error-bg border border-status-error/20 rounded-md cursor-pointer transition-colors duration-150"
          >
            Delete Environment
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="focus-ring flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded-md cursor-pointer transition-colors duration-150 disabled:opacity-50"
          >
            <Save size={11} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
