import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Play,
  Square,
  Trash2,
  Edit2,
  Check,
  X,
  Layers,
  Loader2,
} from "lucide-react";
import * as api from "../lib/api";
import type {
  TunnelGroup,
  ConnectionProfile,
  TunnelState,
} from "../lib/types";

interface TunnelGroupPanelProps {
  profiles: ConnectionProfile[];
  tunnelStates: Record<string, TunnelState>;
}

export function TunnelGroupPanel({
  profiles,
  tunnelStates,
}: TunnelGroupPanelProps) {
  const [groups, setGroups] = useState<TunnelGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    const data = await api.listGroups("local");
    setGroups(data);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreate = async () => {
    if (!name.trim() || selectedProfileIds.length === 0) return;
    await api.createGroup({
      id: "",
      workspace_id: "local",
      name: name.trim(),
      profile_ids: selectedProfileIds,
      sort_order: groups.length,
      created_at: "",
      updated_at: "",
    });
    setName("");
    setSelectedProfileIds([]);
    setShowCreate(false);
    await loadGroups();
  };

  const handleUpdate = async () => {
    if (!editingId || !name.trim()) return;
    const group = groups.find((g) => g.id === editingId);
    if (!group) return;
    await api.updateGroup({
      ...group,
      name: name.trim(),
      profile_ids: selectedProfileIds,
    });
    setEditingId(null);
    setName("");
    setSelectedProfileIds([]);
    await loadGroups();
  };

  const handleDelete = async (id: string) => {
    await api.deleteGroup(id);
    await loadGroups();
  };

  const handleStartGroup = async (groupId: string) => {
    setLoading(groupId);
    try {
      await api.startGroup(groupId);
    } finally {
      setLoading(null);
    }
  };

  const handleStopGroup = async (groupId: string) => {
    setLoading(groupId);
    try {
      await api.stopGroup(groupId);
    } finally {
      setLoading(null);
    }
  };

  const startEditing = (group: TunnelGroup) => {
    setEditingId(group.id);
    setName(group.name);
    setSelectedProfileIds([...group.profile_ids]);
    setShowCreate(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowCreate(false);
    setName("");
    setSelectedProfileIds([]);
  };

  const toggleProfile = (id: string) => {
    setSelectedProfileIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const getGroupStatus = (group: TunnelGroup) => {
    const connected = group.profile_ids.filter(
      (id) => tunnelStates[id]?.status === "connected",
    ).length;
    const total = group.profile_ids.length;
    if (connected === 0) return "disconnected";
    if (connected === total) return "connected";
    return "partial";
  };

  const statusColors = {
    disconnected: "text-text-muted",
    connected: "text-status-connected",
    partial: "text-status-connecting",
  };

  const isEditing = showCreate || editingId !== null;

  return (
    <div className="space-y-6">
      {/* Group list */}
      {groups.length === 0 && !showCreate && (
        <div className="text-center py-12">
          <Layers size={32} className="mx-auto text-text-muted mb-3" />
          <p className="text-sm text-text-secondary mb-1">No tunnel groups yet</p>
          <p className="text-xs text-text-muted mb-4">
            Groups let you start and stop multiple tunnels at once
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 cursor-pointer transition-colors"
          >
            <Plus size={14} />
            Create Group
          </button>
        </div>
      )}

      {groups.length > 0 && (
        <div className="space-y-3">
          {groups.map((group) => {
            const status = getGroupStatus(group);
            const connectedCount = group.profile_ids.filter(
              (id) => tunnelStates[id]?.status === "connected",
            ).length;
            const isGroupLoading = loading === group.id;

            if (editingId === group.id) {
              return (
                <GroupForm
                  key={group.id}
                  name={name}
                  selectedProfileIds={selectedProfileIds}
                  profiles={profiles}
                  onNameChange={setName}
                  onToggleProfile={toggleProfile}
                  onSave={handleUpdate}
                  onCancel={cancelEdit}
                  saveLabel="Save"
                />
              );
            }

            return (
              <div
                key={group.id}
                className="p-4 rounded-xl bg-bg-elevated border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className={statusColors[status]} />
                    <h3 className="text-sm font-semibold text-text-primary">
                      {group.name}
                    </h3>
                    <span className={`text-xs ${statusColors[status]}`}>
                      {connectedCount}/{group.profile_ids.length} connected
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {status === "disconnected" || status === "partial" ? (
                      <button
                        onClick={() => handleStartGroup(group.id)}
                        disabled={isGroupLoading}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-status-connected/15 text-status-connected hover:bg-status-connected/25 border border-status-connected/20 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                      >
                        {isGroupLoading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Play size={12} />
                        )}
                        Start All
                      </button>
                    ) : null}
                    {status === "connected" || status === "partial" ? (
                      <button
                        onClick={() => handleStopGroup(group.id)}
                        disabled={isGroupLoading}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-status-error/15 text-status-error hover:bg-status-error/25 border border-status-error/20 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <Square size={12} />
                        Stop All
                      </button>
                    ) : null}
                    <button
                      onClick={() => startEditing(group)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-status-error hover:bg-surface-hover cursor-pointer transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Profile chips */}
                <div className="flex flex-wrap gap-1.5">
                  {group.profile_ids.map((id) => {
                    const profile = profiles.find((p) => p.id === id);
                    const state = tunnelStates[id];
                    const isConnected = state?.status === "connected";
                    return (
                      <span
                        key={id}
                        className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${
                          isConnected
                            ? "bg-status-connected/10 text-status-connected border-status-connected/20"
                            : "bg-surface text-text-secondary border-border"
                        }`}
                      >
                        {profile?.name ?? id.slice(0, 8)}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create button (when groups exist but not editing) */}
      {groups.length > 0 && !isEditing && (
        <button
          onClick={() => {
            setShowCreate(true);
            setEditingId(null);
            setName("");
            setSelectedProfileIds([]);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-text-muted hover:text-text-secondary hover:border-text-muted text-sm cursor-pointer transition-colors"
        >
          <Plus size={14} />
          New Group
        </button>
      )}

      {/* Create form */}
      {showCreate && (
        <GroupForm
          name={name}
          selectedProfileIds={selectedProfileIds}
          profiles={profiles}
          onNameChange={setName}
          onToggleProfile={toggleProfile}
          onSave={handleCreate}
          onCancel={cancelEdit}
          saveLabel="Create"
        />
      )}
    </div>
  );
}

function GroupForm({
  name,
  selectedProfileIds,
  profiles,
  onNameChange,
  onToggleProfile,
  onSave,
  onCancel,
  saveLabel,
}: {
  name: string;
  selectedProfileIds: string[];
  profiles: ConnectionProfile[];
  onNameChange: (v: string) => void;
  onToggleProfile: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-bg-elevated border border-accent/30 space-y-4">
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          Group Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Development Stack"
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          Profiles ({selectedProfileIds.length} selected)
        </label>
        <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-2 bg-surface">
          {profiles.map((p) => {
            const selected = selectedProfileIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => onToggleProfile(p.id)}
                className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                  selected
                    ? "bg-accent/15 text-accent"
                    : "text-text-secondary hover:bg-surface-hover"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    selected
                      ? "bg-accent border-accent"
                      : "border-border"
                  }`}
                >
                  {selected && <Check size={10} className="text-white" />}
                </div>
                <span className="truncate">{p.name}</span>
                <span className="text-[10px] text-text-muted ml-auto font-mono">
                  :{p.local_port}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary text-sm cursor-pointer transition-colors"
        >
          <X size={13} />
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!name.trim() || selectedProfileIds.length === 0}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 cursor-pointer transition-colors"
        >
          <Check size={13} />
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
