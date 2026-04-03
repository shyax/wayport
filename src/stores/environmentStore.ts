import { create } from "zustand";
import * as api from "../lib/api";
import type { Environment } from "../lib/types";

interface EnvironmentState {
  environments: Environment[];
  activeEnvironmentId: string | null;
  isLoading: boolean;

  loadEnvironments: (workspaceId: string) => Promise<void>;
  switchEnvironment: (id: string | null) => void;
  createEnvironment: (
    workspaceId: string,
    name: string,
    variables?: Record<string, string>,
  ) => Promise<Environment>;
  updateEnvironment: (env: Environment) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;

  getActiveVariables: () => Record<string, string>;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environments: [],
  activeEnvironmentId: null,
  isLoading: false,

  loadEnvironments: async (workspaceId) => {
    set({ isLoading: true });
    const environments = await api.listEnvironments(workspaceId);
    const defaultEnv = environments.find((e) => e.is_default);
    set({
      environments,
      activeEnvironmentId: defaultEnv?.id ?? environments[0]?.id ?? null,
      isLoading: false,
    });
  },

  switchEnvironment: (id) => set({ activeEnvironmentId: id }),

  createEnvironment: async (workspaceId, name, variables = {}) => {
    const now = new Date().toISOString();
    const env: Environment = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      name,
      variables,
      sort_order: get().environments.length,
      is_default: get().environments.length === 0,
      created_at: now,
      updated_at: now,
    };
    const created = await api.createEnvironment(env);
    set((s) => ({ environments: [...s.environments, created] }));
    return created;
  },

  updateEnvironment: async (env) => {
    const updated = { ...env, updated_at: new Date().toISOString() };
    await api.updateEnvironment(updated);
    set((s) => ({
      environments: s.environments.map((e) =>
        e.id === env.id ? updated : e,
      ),
    }));
  },

  deleteEnvironment: async (id) => {
    await api.deleteEnvironment(id);
    set((s) => ({
      environments: s.environments.filter((e) => e.id !== id),
      activeEnvironmentId:
        s.activeEnvironmentId === id ? null : s.activeEnvironmentId,
    }));
  },

  getActiveVariables: () => {
    const { environments, activeEnvironmentId } = get();
    if (!activeEnvironmentId) return {};
    const env = environments.find((e) => e.id === activeEnvironmentId);
    return env?.variables ?? {};
  },
}));
