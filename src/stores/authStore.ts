import { create } from "zustand";
import { supabase, isCloudEnabled } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export type AuthMode = "offline" | "authenticated" | "loading";

interface AuthState {
  user: User | null;
  session: Session | null;
  mode: AuthMode;
  error: string | null;

  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithOAuth: (provider: "github" | "google") => Promise<void>;
  signOut: () => Promise<void>;
  continueOffline: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  mode: isCloudEnabled ? "loading" : "offline",
  error: null,

  initialize: async () => {
    if (!supabase) {
      set({ mode: "offline" });
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      set({
        user: session.user,
        session,
        mode: "authenticated",
      });
    } else {
      set({ mode: "loading" }); // show login screen
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        set({
          user: session.user,
          session,
          mode: "authenticated",
          error: null,
        });
      } else {
        set({ user: null, session: null });
      }
    });
  },

  signInWithEmail: async (email, password) => {
    if (!supabase) return;
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) set({ error: error.message });
  },

  signUp: async (email, password, displayName) => {
    if (!supabase) return;
    set({ error: null });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) set({ error: error.message });
  },

  signInWithOAuth: async (provider) => {
    if (!supabase) return;
    set({ error: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: "porthole://auth/callback",
      },
    });
    if (error) set({ error: error.message });
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null, session: null, mode: "loading", error: null });
  },

  continueOffline: () => {
    set({ mode: "offline", error: null });
  },
}));
