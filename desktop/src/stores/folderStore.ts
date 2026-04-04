import { create } from "zustand";
import * as api from "../lib/api";
import type { Folder } from "../lib/types";

interface FolderState {
  folders: Folder[];
  expandedIds: Set<string>;
  isLoading: boolean;

  loadFolders: (workspaceId: string) => Promise<void>;
  createFolder: (
    workspaceId: string,
    name: string,
    parentId?: string | null,
  ) => Promise<Folder>;
  renameFolder: (folder: Folder, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  toggleExpanded: (id: string) => void;
  expandFolder: (id: string) => void;
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folders: [],
  expandedIds: new Set<string>(),
  isLoading: false,

  loadFolders: async (workspaceId) => {
    set({ isLoading: true });
    const folders = await api.listFolders(workspaceId);
    set({ folders, isLoading: false });
  },

  createFolder: async (workspaceId, name, parentId = null) => {
    const now = new Date().toISOString();
    const folder: Folder = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      parent_id: parentId ?? null,
      name,
      sort_order: get().folders.length,
      created_at: now,
      updated_at: now,
    };
    const created = await api.createFolder(folder);
    set((s) => ({ folders: [...s.folders, created] }));
    return created;
  },

  renameFolder: async (folder, name) => {
    const updated = { ...folder, name, updated_at: new Date().toISOString() };
    await api.updateFolder(updated);
    set((s) => ({
      folders: s.folders.map((f) => (f.id === folder.id ? updated : f)),
    }));
  },

  deleteFolder: async (id) => {
    await api.deleteFolder(id);
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
    }));
  },

  toggleExpanded: (id) =>
    set((s) => {
      const next = new Set(s.expandedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedIds: next };
    }),

  expandFolder: (id) =>
    set((s) => {
      const next = new Set(s.expandedIds);
      next.add(id);
      return { expandedIds: next };
    }),
}));
