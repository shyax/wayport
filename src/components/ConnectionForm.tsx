import { useState } from "react";
import { Folder, X } from "lucide-react";
import * as api from "../lib/api";
import { DEFAULT_PROFILE, type ConnectionProfile, type NewConnectionProfile } from "../lib/types";
import { v4 as uuidv4 } from "uuid";

interface ConnectionFormProps {
  editing?: ConnectionProfile | null;
  onSave: (profile: NewConnectionProfile | ConnectionProfile) => void;
  onCancel: () => void;
}

export function ConnectionForm({
  editing,
  onSave,
  onCancel,
}: ConnectionFormProps) {
  const [form, setForm] = useState<NewConnectionProfile>(
    editing ? editing : DEFAULT_PROFILE,
  );
  const [keyPath, setKeyPath] = useState(form.identity_file);
  const [loading, setLoading] = useState(false);

  const handleSelectKey = async () => {
    try {
      const path = await api.selectKeyFile();
      if (path) {
        setKeyPath(path);
        setForm({ ...form, identity_file: path });
      }
    } catch (err) {
      console.error("Failed to select key file:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = editing
        ? { ...form, id: editing.id, created_at: editing.created_at, updated_at: new Date().toISOString() }
        : { ...form };
      await onSave(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">
        {editing ? "Edit Connection" : "New Connection"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            placeholder="e.g. Staging Postgres"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              SSH Username
            </label>
            <input
              type="text"
              required
              value={form.ssh_user}
              onChange={(e) => setForm({ ...form, ssh_user: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="ec2-user"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Bastion Host
            </label>
            <input
              type="text"
              required
              value={form.bastion_host}
              onChange={(e) =>
                setForm({ ...form, bastion_host: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="IP or hostname"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Bastion Port
            </label>
            <input
              type="number"
              required
              value={form.bastion_port}
              onChange={(e) =>
                setForm({ ...form, bastion_port: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SSH Key</label>
            <button
              type="button"
              onClick={handleSelectKey}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 hover:bg-slate-700 transition flex items-center gap-2 justify-center"
            >
              <Folder size={16} />
              {keyPath ? "Change Key" : "Select Key"}
            </button>
            {keyPath && (
              <p className="text-xs text-slate-400 mt-1 truncate">{keyPath}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Remote Host
          </label>
          <input
            type="text"
            required
            value={form.remote_host}
            onChange={(e) =>
              setForm({ ...form, remote_host: e.target.value })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            placeholder="e.g. staging-postgres.c09i026o84qj.us-east-1.rds.amazonaws.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Local Port
            </label>
            <input
              type="number"
              required
              value={form.local_port}
              onChange={(e) =>
                setForm({ ...form, local_port: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Remote Port
            </label>
            <input
              type="number"
              required
              value={form.remote_port}
              onChange={(e) =>
                setForm({ ...form, remote_port: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoReconnect"
            checked={form.auto_reconnect}
            onChange={(e) =>
              setForm({ ...form, auto_reconnect: e.target.checked })
            }
            className="w-4 h-4 bg-slate-800 border border-slate-700 rounded"
          />
          <label htmlFor="autoReconnect" className="text-sm">
            Auto-reconnect when tunnel drops
          </label>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded font-medium transition"
          >
            {loading ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
