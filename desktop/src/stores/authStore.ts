import { create } from "zustand";
import {
  isCloudEnabled,
  getTokens,
  setTokens,
  isTokenExpired,
  refreshAccessToken,
  AuthTokens,
} from "../lib/auth";

export type AuthMode = "offline" | "authenticated" | "loading";

interface AuthState {
  mode: AuthMode;
  email: string | null;
  error: string | null;

  initialize: () => void;
  handleAuthCallback: (tokens: AuthTokens, email: string) => void;
  signOut: () => void;
  continueOffline: () => void;
  getValidToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  mode: isCloudEnabled ? "loading" : "offline",
  email: null,
  error: null,

  initialize: () => {
    if (!isCloudEnabled) {
      set({ mode: "offline" });
      return;
    }

    // Check if we have stored tokens
    const tokens = getTokens();
    if (tokens && !isTokenExpired()) {
      set({ mode: "authenticated" });
    } else {
      set({ mode: "loading" }); // show login
    }
  },

  handleAuthCallback: (tokens: AuthTokens, email: string) => {
    setTokens(tokens);
    set({ mode: "authenticated", email, error: null });
  },

  signOut: () => {
    setTokens(null);
    set({ mode: "loading", email: null, error: null });
  },

  continueOffline: () => {
    set({ mode: "offline", error: null });
  },

  getValidToken: async () => {
    const tokens = getTokens();
    if (!tokens) return null;

    if (isTokenExpired()) {
      try {
        const refreshed = await refreshAccessToken(tokens.refreshToken);
        setTokens(refreshed);
        return refreshed.accessToken;
      } catch {
        get().signOut();
        return null;
      }
    }

    return tokens.accessToken;
  },
}));
