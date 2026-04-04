import { useState } from "react";
import { Folder, Plus, Trash2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import * as api from "../lib/api";
import {
  DEFAULT_PROFILE,
  type ConnectionProfile,
  type NewConnectionProfile,
  type ForwardingType,
  type JumpHost,
  type Folder as FolderType,
} from "../lib/types";

interface ConnectionFormProps {
  editing?: ConnectionProfile | null;
  folders?: FolderType[];
  onSave: (profile: NewConnectionProfile | ConnectionProfile) => void;
  onCancel: () => void;
}

const FORWARDING_LABELS: Record<
  ForwardingType,
  { label: string; flag: string; desc: string }
> = {
  local: {
    label: "Local",
    flag: "-L",
    desc: "Forward remote port to localhost",
  },
  remote: {
    label: "Remote",
    flag: "-R",
    desc: "Expose local service to remote",
  },
  dynamic: {
    label: "SOCKS",
    flag: "-D",
    desc: "SOCKS5 proxy through SSH",
  },
};

export function ConnectionForm({
  editing,
  folders = [],
  onSave,
  onCancel,
}: ConnectionFormProps) {
  const [form, setForm] = useState<NewConnectionProfile>(
    editing ? editing : DEFAULT_PROFILE,
  );
  const [keyPath, setKeyPath] = useState(form.identity_file);
  const [loading, setLoading] = useState(false);
  const [portConflict, setPortConflict] = useState<string | null>(null);

  const isPortValid = (p: number) => p > 0 && p < 65536;
  const localPortValid = isPortValid(form.local_port);
  const bastionPortValid = isPortValid(form.bastion_port);

  const isDynamic = form.forwarding_type === "dynamic";

  const handleSelectKey = async () => {
    try {
      const path = await open({
        title: "Select SSH Key",
        multiple: false,
        directory: false,
        defaultPath: "~/.ssh",
      });
      if (path) {
        setKeyPath(path);
        setForm({ ...form, identity_file: path });
      }
    } catch (err) {
      console.error("Failed to select key file:", err);
    }
  };

  const handlePortChange = async (port: number) => {
    setForm({ ...form, local_port: port });
    if (port > 0 && port < 65536) {
      try {
        const available = await api.checkPortAvailable(port);
        setPortConflict(available ? null : `Port ${port} is already in use`);
      } catch {
        setPortConflict(null);
      }
    }
  };

  const addJumpHost = () => {
    setForm({
      ...form,
      jump_hosts: [...form.jump_hosts, { host: "", port: 22, user: "" }],
    });
  };

  const updateJumpHost = (index: number, updates: Partial<JumpHost>) => {
    const jump_hosts = form.jump_hosts.map((jh, i) =>
      i === index ? { ...jh, ...updates } : jh,
    );
    setForm({ ...form, jump_hosts });
  };

  const removeJumpHost = (index: number) => {
    setForm({
      ...form,
      jump_hosts: form.jump_hosts.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = editing
        ? {
            ...form,
            id: editing.id,
            created_at: editing.created_at,
            updated_at: new Date().toISOString(),
          }
        : { ...form };
      await onSave(data);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors duration-150";

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold tracking-tight text-text-primary mb-6">
        {editing ? "Edit Connection" : "New Connection"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Name
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder="e.g. Staging Postgres"
          />
        </div>

        {/* Folder */}
        {folders.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Folder
            </label>
            <select
              value={form.folder_id ?? ""}
              onChange={(e) =>
                setForm({ ...form, folder_id: e.target.value || null })
              }
              className={inputClass}
            >
              <option value="">No folder (root)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Forwarding Type Selector */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">
            Forwarding Type
          </label>
          <div className="flex gap-1 bg-surface p-1 rounded-lg border border-border">
            {(Object.keys(FORWARDING_LABELS) as ForwardingType[]).map(
              (type_) => {
                const info = FORWARDING_LABELS[type_];
                const isActive = form.forwarding_type === type_;
                return (
                  <button
                    key={type_}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, forwarding_type: type_ })
                    }
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150 ${
                      isActive
                        ? "bg-accent text-bg"
                        : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                    }`}
                  >
                    <span className="block text-[13px]">{info.label}</span>
                    <span
                      className={`block text-[11px] mt-0.5 font-mono ${isActive ? "text-bg/70" : "text-text-muted"}`}
                    >
                      {info.flag}
                    </span>
                  </button>
                );
              },
            )}
          </div>
          <p className="text-[11px] text-text-muted mt-1.5">
            {FORWARDING_LABELS[form.forwarding_type].desc}
          </p>
        </div>

        {/* SSH section */}
        <div className="p-4 rounded-xl bg-bg-elevated border border-border space-y-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            SSH Connection
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                SSH Username
              </label>
              <input
                type="text"
                required
                value={form.ssh_user}
                onChange={(e) =>
                  setForm({ ...form, ssh_user: e.target.value })
                }
                className={inputClass}
                placeholder="ec2-user"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Bastion Host
              </label>
              <input
                type="text"
                required
                value={form.bastion_host}
                onChange={(e) =>
                  setForm({ ...form, bastion_host: e.target.value })
                }
                className={inputClass}
                placeholder="IP or hostname"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Bastion Port
              </label>
              <input
                type="number"
                required
                value={form.bastion_port}
                onChange={(e) =>
                  setForm({
                    ...form,
                    bastion_port: parseInt(e.target.value),
                  })
                }
                className={`${inputClass} ${!bastionPortValid ? "border-status-error focus:border-status-error" : ""}`}
              />
              {!bastionPortValid && (
                <p className="text-[11px] text-status-error mt-1">Port must be 1–65535</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                SSH Key
              </label>
              <button
                type="button"
                onClick={handleSelectKey}
                className="focus-ring w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors duration-150 flex items-center gap-2 justify-center text-sm"
              >
                <Folder size={14} />
                {keyPath ? "Change Key" : "Select Key"}
              </button>
              {keyPath && (
                <p className="text-[11px] text-text-muted mt-1 truncate font-mono">
                  {keyPath}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Port Forwarding section */}
        <div className="p-4 rounded-xl bg-bg-elevated border border-border space-y-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Port Mapping
          </p>

          {!isDynamic && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  {form.forwarding_type === "remote"
                    ? "Target Host (local side)"
                    : "Remote Host"}
                </label>
                <input
                  type="text"
                  required
                  value={form.remote_host ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, remote_host: e.target.value })
                  }
                  className={inputClass}
                  placeholder={
                    form.forwarding_type === "remote"
                      ? "e.g. localhost"
                      : "e.g. staging-postgres.rds.amazonaws.com"
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    {form.forwarding_type === "remote"
                      ? "Remote Bind Port"
                      : "Local Port"}
                  </label>
                  <input
                    type="number"
                    required
                    value={form.local_port}
                    onChange={(e) =>
                      handlePortChange(parseInt(e.target.value))
                    }
                    className={`${inputClass} ${!localPortValid || portConflict ? "border-status-error focus:border-status-error" : ""}`}
                  />
                  {!localPortValid && (
                    <p className="text-[11px] text-status-error mt-1">Port must be 1–65535</p>
                  )}
                  {localPortValid && portConflict && (
                    <p className="text-[11px] text-status-reconnecting mt-1">
                      {portConflict}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    {form.forwarding_type === "remote"
                      ? "Target Port (local side)"
                      : "Remote Port"}
                  </label>
                  <input
                    type="number"
                    required
                    value={form.remote_port ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        remote_port: parseInt(e.target.value),
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          {isDynamic && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                SOCKS Proxy Port
              </label>
              <input
                type="number"
                required
                value={form.local_port}
                onChange={(e) => handlePortChange(parseInt(e.target.value))}
                className={`${inputClass} ${!localPortValid || portConflict ? "border-status-error focus:border-status-error" : ""}`}
                placeholder="1080"
              />
              {!localPortValid && (
                <p className="text-[11px] text-status-error mt-1">Port must be 1–65535</p>
              )}
              {localPortValid && portConflict && (
                <p className="text-[11px] text-status-reconnecting mt-1">
                  {portConflict}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Jump Hosts */}
        <div className="p-4 rounded-xl bg-bg-elevated border border-border space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Jump Hosts{" "}
              <span className="normal-case text-text-muted font-normal">(ProxyJump)</span>
            </p>
            <button
              type="button"
              onClick={addJumpHost}
              className="focus-ring text-xs text-accent hover:text-accent-hover flex items-center gap-1 cursor-pointer transition-colors duration-150"
            >
              <Plus size={12} />
              Add hop
            </button>
          </div>
          {form.jump_hosts.length === 0 && (
            <p className="text-[11px] text-text-muted">
              No intermediate hops — direct connection to bastion
            </p>
          )}
          {form.jump_hosts.map((jh, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 items-end"
            >
              <div>
                {i === 0 && (
                  <label className="block text-[11px] text-text-muted mb-1">
                    User
                  </label>
                )}
                <input
                  type="text"
                  required
                  value={jh.user}
                  onChange={(e) =>
                    updateJumpHost(i, { user: e.target.value })
                  }
                  className={inputClass}
                  placeholder="user"
                />
              </div>
              <div>
                {i === 0 && (
                  <label className="block text-[11px] text-text-muted mb-1">
                    Host
                  </label>
                )}
                <input
                  type="text"
                  required
                  value={jh.host}
                  onChange={(e) =>
                    updateJumpHost(i, { host: e.target.value })
                  }
                  className={inputClass}
                  placeholder="jump-host"
                />
              </div>
              <div>
                {i === 0 && (
                  <label className="block text-[11px] text-text-muted mb-1">
                    Port
                  </label>
                )}
                <input
                  type="number"
                  required
                  value={jh.port}
                  onChange={(e) =>
                    updateJumpHost(i, { port: parseInt(e.target.value) })
                  }
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => removeJumpHost(i)}
                className="focus-ring p-2 text-text-muted hover:text-status-error cursor-pointer transition-colors duration-150"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Tags <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <div
            className="flex flex-wrap items-center gap-1.5 min-h-[38px] px-2 py-1.5 bg-surface border border-border rounded-lg focus-within:border-accent transition-colors"
            onClick={() => document.getElementById("tag-input")?.focus()}
          >
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/15 text-accent text-xs rounded-md border border-accent/20"
              >
                {tag}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
                  }}
                  className="hover:text-status-error cursor-pointer transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </span>
            ))}
            <input
              id="tag-input"
              type="text"
              placeholder={form.tags.length === 0 ? "e.g. production, database" : ""}
              className="flex-1 min-w-[100px] bg-transparent text-text-primary text-sm placeholder-text-muted outline-none"
              onKeyDown={(e) => {
                const input = e.currentTarget;
                if ((e.key === "Enter" || e.key === ",") && input.value.trim()) {
                  e.preventDefault();
                  const tag = input.value.trim().replace(/,/g, "");
                  if (tag && !form.tags.includes(tag)) {
                    setForm({ ...form, tags: [...form.tags, tag] });
                  }
                  input.value = "";
                }
                if (e.key === "Backspace" && !input.value && form.tags.length > 0) {
                  setForm({ ...form, tags: form.tags.slice(0, -1) });
                }
              }}
            />
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            id="autoReconnect"
            checked={form.auto_reconnect}
            onChange={(e) =>
              setForm({ ...form, auto_reconnect: e.target.checked })
            }
            className="w-4 h-4 rounded bg-surface border-border accent-accent cursor-pointer"
          />
          <label
            htmlFor="autoReconnect"
            className="text-sm text-text-secondary cursor-pointer"
          >
            Auto-reconnect when tunnel drops
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="focus-ring flex-1 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-bg rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150"
          >
            {loading ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="focus-ring px-4 py-2.5 bg-surface hover:bg-surface-hover border border-border text-text-secondary rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
