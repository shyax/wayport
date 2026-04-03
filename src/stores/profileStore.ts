import { create } from "zustand";
import * as api from "../lib/api";
import type {
  ConnectionProfile,
  NewConnectionProfile,
  TunnelState,
} from "../lib/types";

interface ProfileState {
  profiles: ConnectionProfile[];
  tunnelStates: Record<string, TunnelState>;
  selectedId: string | null;
  showForm: boolean;
  editingProfile: ConnectionProfile | null;

  loadProfiles: () => Promise<void>;
  setTunnelStates: (states: Record<string, TunnelState>) => void;
  updateTunnelState: (state: TunnelState) => void;

  select: (id: string | null) => void;
  showCreateForm: () => void;
  showEditForm: (profile: ConnectionProfile) => void;
  hideForm: () => void;

  createProfile: (data: NewConnectionProfile) => Promise<void>;
  updateProfile: (data: ConnectionProfile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  moveToFolder: (profileId: string, folderId: string | null) => Promise<void>;

  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;

  importProfiles: () => Promise<void>;
  exportProfiles: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  tunnelStates: {},
  selectedId: null,
  showForm: false,
  editingProfile: null,

  loadProfiles: async () => {
    const profiles = await api.listProfiles();
    set({ profiles });
  },

  setTunnelStates: (states) => set({ tunnelStates: states }),

  updateTunnelState: (state) =>
    set((s) => ({
      tunnelStates: { ...s.tunnelStates, [state.profile_id]: state },
    })),

  select: (id) => set({ selectedId: id, showForm: false }),

  showCreateForm: () => set({ showForm: true, editingProfile: null }),

  showEditForm: (profile) => set({ showForm: true, editingProfile: profile }),

  hideForm: () => set({ showForm: false, editingProfile: null }),

  createProfile: async (data) => {
    const profile = await api.createProfile(data);
    set((s) => ({
      profiles: [...s.profiles, profile],
      selectedId: profile.id,
      showForm: false,
      editingProfile: null,
    }));
  },

  updateProfile: async (data) => {
    const profile = await api.updateProfile(data);
    set((s) => ({
      profiles: s.profiles.map((p) => (p.id === profile.id ? profile : p)),
      showForm: false,
      editingProfile: null,
    }));
  },

  deleteProfile: async (id) => {
    await api.stopTunnel(id).catch(() => {});
    await api.deleteProfile(id);
    set((s) => ({
      profiles: s.profiles.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      tunnelStates: Object.fromEntries(
        Object.entries(s.tunnelStates).filter(([k]) => k !== id),
      ),
    }));
  },

  moveToFolder: async (profileId, folderId) => {
    const profile = get().profiles.find((p) => p.id === profileId);
    if (!profile) return;
    const updated = { ...profile, folder_id: folderId };
    await api.updateProfile(updated);
    set((s) => ({
      profiles: s.profiles.map((p) => (p.id === profileId ? updated : p)),
    }));
  },

  connect: async (id) => {
    await api.startTunnel(id);
  },

  disconnect: async (id) => {
    await api.stopTunnel(id);
  },

  importProfiles: async () => {
    const count = await api.importProfiles();
    if (count > 0) {
      const profiles = await api.listProfiles();
      set({ profiles });
    }
  },

  exportProfiles: async () => {
    await api.exportProfiles();
  },
}));
