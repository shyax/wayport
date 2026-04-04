import { create } from "zustand";
import * as api from "../lib/api";
import type { HistoryEntry } from "../lib/types";

interface HistoryState {
  entries: HistoryEntry[];
  isLoading: boolean;

  loadHistory: (workspaceId: string, limit?: number) => Promise<void>;
  recordEvent: (
    workspaceId: string,
    profileId: string | null,
    profileName: string,
    action: HistoryEntry["action"],
    details?: string,
  ) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],
  isLoading: false,

  loadHistory: async (workspaceId, limit = 100) => {
    set({ isLoading: true });
    try {
      const entries = await api.getHistory(workspaceId, limit);
      set({ entries, isLoading: false });
    } catch {
      set({ entries: [], isLoading: false });
    }
  },

  recordEvent: async (workspaceId, profileId, profileName, action, details) => {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      profile_id: profileId,
      profile_name: profileName,
      user_display_name: "Local User",
      action,
      details: details ?? null,
      duration_secs: null,
      created_at: new Date().toISOString(),
    };
    await api.recordConnectionEvent(entry);
    set((s) => ({ entries: [entry, ...s.entries] }));
  },
}));
