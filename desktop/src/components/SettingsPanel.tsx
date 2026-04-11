import { useEffect, useState } from "react";
import * as api from "../lib/api";

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

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
          General
        </h3>
        <div className="space-y-1">
          <label className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
            <div>
              <p className="text-sm text-text-primary">Launch at login</p>
              <p className="text-xs text-text-muted mt-0.5">
                Start Porthole automatically when you log in
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
