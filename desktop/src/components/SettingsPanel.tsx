import { useEffect, useState } from "react";
import { Cloud, CloudOff, LogOut, LogIn } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import * as api from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { isCloudEnabled, buildLoginUrl } from "../lib/auth";

function Toggle({
  checked,
  loading,
  onToggle,
}: {
  checked: boolean;
  loading?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ${
        checked ? "bg-accent" : "bg-surface-hover border border-border"
      } ${loading ? "opacity-50" : ""}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

export function SettingsPanel() {
  const [autostart, setAutostart] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(true);

  const { mode, email, signOut } = useAuthStore();

  useEffect(() => {
    Promise.all([
      api.getAutostartEnabled().catch(() => false),
      api.getPreference("notifications_enabled").catch(() => null),
    ]).then(([auto, notifPref]) => {
      setAutostart(auto);
      setNotifications(notifPref !== "false");
      setLoading(false);
    });
  }, []);

  const toggleAutostart = async () => {
    const next = !autostart;
    try {
      await api.setAutostartEnabled(next);
      setAutostart(next);
    } catch (e) {
      console.error("Failed to set autostart:", e);
    }
  };

  const toggleNotifications = async () => {
    const next = !notifications;
    try {
      await api.setPreference("notifications_enabled", String(next));
      setNotifications(next);
    } catch (e) {
      console.error("Failed to set notification preference:", e);
    }
  };

  const handleSignIn = async () => {
    try {
      await openUrl(buildLoginUrl());
    } catch (e) {
      console.error("Failed to open login URL:", e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account / Cloud Sync section */}
      {isCloudEnabled && (
        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Account
          </h3>
          <div className="space-y-1">
            {mode === "authenticated" ? (
              <>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                      <Cloud size={16} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-text-primary font-medium">
                        {email ?? "Signed in"}
                      </p>
                      <p className="text-xs text-text-muted">
                        Cloud sync enabled
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-status-error hover:bg-status-error/10 rounded-md cursor-pointer transition-colors"
                  >
                    <LogOut size={12} />
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center flex-shrink-0">
                    <CloudOff size={16} className="text-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm text-text-primary">Offline mode</p>
                    <p className="text-xs text-text-muted">
                      Sign in to sync across devices
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 rounded-md cursor-pointer transition-colors"
                >
                  <LogIn size={12} />
                  Sign in
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
          General
        </h3>
        <div className="space-y-1">
          <label className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
            <div>
              <p className="text-sm text-text-primary">Launch at login</p>
              <p className="text-xs text-text-muted mt-0.5">
                Start Wayport automatically when you log in
              </p>
            </div>
            <Toggle checked={autostart} loading={loading} onToggle={toggleAutostart} />
          </label>

          <label className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
            <div>
              <p className="text-sm text-text-primary">Notifications</p>
              <p className="text-xs text-text-muted mt-0.5">
                Show alerts when tunnels connect, disconnect, or fail
              </p>
            </div>
            <Toggle checked={notifications} loading={loading} onToggle={toggleNotifications} />
          </label>
        </div>
      </section>
    </div>
  );
}
