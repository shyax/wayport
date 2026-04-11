import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAuthStore } from "../stores/authStore";
import { isCloudEnabled, buildLoginUrl } from "../lib/auth";
import { Cloud, Loader2, WifiOff } from "lucide-react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { mode, error, initialize, handleAuthCallback, continueOffline } =
    useAuthStore();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Listen for deep-link callbacks (wayport://auth/callback?code=XXX)
  useEffect(() => {
    if (!isCloudEnabled) return;

    const unlisten = listen<string>("deep-link-received", async (event) => {
      const url = event.payload;
      if (url.startsWith("wayport://auth/callback")) {
        try {
          const params = new URL(url).searchParams;
          const code = params.get("code");
          if (code) {
            setSigningIn(false);
            await handleAuthCallback(code);
          }
        } catch {
          // URL parse error — ignore
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [handleAuthCallback]);

  // No cloud configured — go straight to app
  if (!isCloudEnabled) return <>{children}</>;

  // Offline or authenticated — show app
  if (mode === "offline" || mode === "authenticated") return <>{children}</>;

  // Loading / login screen
  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await openUrl(buildLoginUrl());
    } catch {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="w-80 text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Cloud size={32} className="text-accent" />
          </div>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Welcome to Wayport
          </h1>
          <p className="text-sm text-text-muted mt-2">
            Sign in to sync your connections across devices
          </p>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-status-error/10 border border-status-error/20">
            <p className="text-xs text-status-error">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-bg rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-150 disabled:opacity-50"
          >
            {signingIn ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Waiting for browser...
              </>
            ) : (
              "Sign in with SSO"
            )}
          </button>

          <button
            onClick={continueOffline}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 text-text-muted hover:text-text-secondary text-sm cursor-pointer transition-colors duration-150"
          >
            <WifiOff size={14} />
            Continue offline
          </button>
        </div>

        <p className="text-[11px] text-text-muted">
          Your connections are always stored locally.
          <br />
          Sign in to enable cloud sync.
        </p>
      </div>
    </div>
  );
}
