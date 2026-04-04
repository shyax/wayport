import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FolderIcon,
  FolderOpen,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { ConnectionItem } from "./ConnectionItem";
import type { ConnectionProfile, Folder, TunnelState } from "../lib/types";
import { useFolderStore } from "../stores/folderStore";

interface FolderTreeProps {
  folders: Folder[];
  profiles: ConnectionProfile[];
  tunnelStates: Record<string, TunnelState>;
  selectedId: string | null;
  workspaceId: string;
  onSelectProfile: (id: string) => void;
}

export function FolderTree({
  folders,
  profiles,
  tunnelStates,
  selectedId,
  workspaceId,
  onSelectProfile,
}: FolderTreeProps) {
  const { expandedIds, toggleExpanded, createFolder, renameFolder, deleteFolder } =
    useFolderStore();

  const rootFolders = folders
    .filter((f) => !f.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const rootProfiles = profiles
    .filter((p) => !p.folder_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(workspaceId, newFolderName.trim());
    setNewFolderName("");
    setCreatingFolder(false);
  };

  return (
    <div className="space-y-0.5">
      {rootFolders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          allFolders={folders}
          profiles={profiles.filter((p) => p.folder_id === folder.id)}
          tunnelStates={tunnelStates}
          selectedId={selectedId}
          expanded={expandedIds.has(folder.id)}
          onToggle={() => toggleExpanded(folder.id)}
          onSelectProfile={onSelectProfile}
          onRename={(name) => renameFolder(folder, name)}
          onDelete={() => deleteFolder(folder.id)}
        />
      ))}

      {rootProfiles.map((profile) => (
        <ConnectionItem
          key={profile.id}
          profile={profile}
          tunnelState={tunnelStates[profile.id]}
          isSelected={profile.id === selectedId}
          onSelect={() => onSelectProfile(profile.id)}
        />
      ))}

      {creatingFolder ? (
        <div className="px-3 py-1">
          <input
            autoFocus
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") setCreatingFolder(false);
            }}
            onBlur={handleCreateFolder}
            placeholder="Folder name"
            className="w-full px-2 py-1 bg-surface border border-border rounded text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>
      ) : (
        <button
          onClick={() => setCreatingFolder(true)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-text-muted hover:text-text-secondary cursor-pointer transition-colors duration-150"
        >
          <Plus size={12} />
          New Folder
        </button>
      )}
    </div>
  );
}

function FolderNode({
  folder,
  allFolders,
  profiles,
  tunnelStates,
  selectedId,
  expanded,
  onToggle,
  onSelectProfile,
  onRename,
  onDelete,
}: {
  folder: Folder;
  allFolders: Folder[];
  profiles: ConnectionProfile[];
  tunnelStates: Record<string, TunnelState>;
  selectedId: string | null;
  expanded: boolean;
  onToggle: () => void;
  onSelectProfile: (id: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [hovering, setHovering] = useState(false);

  const childFolders = allFolders.filter((f) => f.parent_id === folder.id);
  const hasChildren = childFolders.length > 0 || profiles.length > 0;

  const handleRename = () => {
    if (editName.trim() && editName !== folder.name) {
      onRename(editName.trim());
    }
    setEditing(false);
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-surface-hover cursor-pointer group transition-colors duration-150"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={onToggle}
      >
        <span className="text-text-muted flex-shrink-0">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="text-text-muted flex-shrink-0">
          {expanded ? <FolderOpen size={13} /> : <FolderIcon size={13} />}
        </span>
        {editing ? (
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setEditing(false);
              e.stopPropagation();
            }}
            onBlur={handleRename}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-1 py-0 bg-surface border border-accent rounded text-xs text-text-primary focus:outline-none min-w-0"
          />
        ) : (
          <span className="flex-1 text-xs text-text-secondary truncate">
            {folder.name}
          </span>
        )}
        {hovering && !editing && (
          <div className="flex gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
                setEditName(folder.name);
              }}
              className="p-0.5 text-text-muted hover:text-text-secondary"
            >
              <Pencil size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-0.5 text-text-muted hover:text-status-error"
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}
        {!hovering && (
          <span className="text-[10px] text-text-muted">{profiles.length}</span>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="ml-4 border-l border-border-subtle">
          {profiles.map((profile) => (
            <ConnectionItem
              key={profile.id}
              profile={profile}
              tunnelState={tunnelStates[profile.id]}
              isSelected={profile.id === selectedId}
              onSelect={() => onSelectProfile(profile.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
