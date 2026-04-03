import { create } from "zustand";
import * as api from "../lib/api";
import type { Workspace } from "../lib/types";

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  isLoading: boolean;

  loadWorkspaces: () => Promise<void>;
  switchWorkspace: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspaceId: "local",
  isLoading: false,

  loadWorkspaces: async () => {
    set({ isLoading: true });
    const workspaces = await api.listWorkspaces();
    set({ workspaces, isLoading: false });
  },

  switchWorkspace: (id: string) => {
    set({ activeWorkspaceId: id });
  },
}));
