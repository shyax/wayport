import { create } from "zustand";
import {
  isCloudEnabled,
  getTokens,
  setTokens,
  isTokenExpired,
  exchangeCodeForTokens,
  refreshAccessToken,
  extractEmailFromIdToken,
  type AuthTokens,
} from "../lib/auth";
import {
  loadAuthTokens,
  saveAuthTokens,
  clearAuthTokens,
} from "../lib/api";

export type AuthMode = "offline" | "authenticated" | "loading";

interface AuthState {
  mode: AuthMode;
  email: string | null;
  error: string | null;

  initialize: () => Promise<void>;
  handleAuthCallback: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueOffline: () => void;
  getValidToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  mode: isCloudEnabled ? "loading" : "offline",
  email: null,
  error: null,

  initialize: async () => {
    if (!isCloudEnabled) {
      set({ mode: "offline" });
      return;
    }

    try {
      const stored = await loadAuthTokens();
      if (stored?.access_token && stored?.refresh_token) {
        // Hydrate in-memory token cache
        const tokens: AuthTokens = {
          accessToken: stored.access_token,
          idToken: stored.id_token ?? "",
          refreshToken: stored.refresh_token,
          expiresAt: stored.expires_at ?? 0,
        };
        setTokens(tokens);

        if (!isTokenExpired()) {
          set({
            mode: "authenticated",
            email: stored.email ?? null,
          });
          return;
        }

        // Try refreshing expired tokens
        try {
          const refreshed = await refreshAccessToken(tokens.refreshToken);
          setTokens(refreshed);
          const email = extractEmailFromIdToken(refreshed.idToken) ?? stored.email ?? null;
          await saveAuthTokens({
            access_token: refreshed.accessToken,
            id_token: refreshed.idToken,
            refresh_token: refreshed.refreshToken,
            email,
            expires_at: refreshed.expiresAt,
          });
          set({ mode: "authenticated", email });
          return;
        } catch {
          // Refresh failed — user needs to re-authenticate
          setTokens(null);
        }
      }
    } catch {
      // IPC or parse error — fall through to login screen
    }

    set({ mode: "loading" });
  },

  handleAuthCallback: async (code: string) => {
    try {
      set({ error: null });
      const tokens = await exchangeCodeForTokens(code);
      setTokens(tokens);

      const email = extractEmailFromIdToken(tokens.idToken);

      await saveAuthTokens({
        access_token: tokens.accessToken,
        id_token: tokens.idToken,
        refresh_token: tokens.refreshToken,
        email,
        expires_at: tokens.expiresAt,
      });

      set({ mode: "authenticated", email, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Authentication failed" });
    }
  },

  signOut: async () => {
    setTokens(null);
    try {
      await clearAuthTokens();
    } catch {
      // Best-effort cleanup
    }
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
        // Persist refreshed tokens
        const email = extractEmailFromIdToken(refreshed.idToken) ?? get().email;
        await saveAuthTokens({
          access_token: refreshed.accessToken,
          id_token: refreshed.idToken,
          refresh_token: refreshed.refreshToken,
          email,
          expires_at: refreshed.expiresAt,
        }).catch(() => {});
        return refreshed.accessToken;
      } catch {
        get().signOut();
        return null;
      }
    }

    return tokens.accessToken;
  },
}));
