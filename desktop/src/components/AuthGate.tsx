import { useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import { isCloudEnabled } from "../lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { mode, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // No cloud configured — go straight to app
  if (!isCloudEnabled) return <>{children}</>;

  // Loading auth state — could show a login screen here
  if (mode === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <p className="text-text-muted text-sm">Checking authentication...</p>
      </div>
    );
  }

  // Offline or authenticated — show app
  return <>{children}</>;
}
