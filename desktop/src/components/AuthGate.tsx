import { useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import { isCloudEnabled } from "../lib/supabase";
import { LoginForm } from "./LoginForm";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { mode, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // No cloud configured — go straight to app
  if (!isCloudEnabled) return <>{children}</>;

  // Loading auth state
  if (mode === "loading") return <LoginForm />;

  // Offline or authenticated — show app
  return <>{children}</>;
}
