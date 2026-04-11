import { useEffect, useCallback, useState, useRef } from "react";
import { Sidebar, type SidebarView } from "./components/Sidebar";
import { ConnectionDetail } from "./components/ConnectionDetail";
import { ConnectionForm } from "./components/ConnectionForm";
import { CommandPalette } from "./components/CommandPalette";
import { StatusBar } from "./components/StatusBar";
import { EmptyState } from "./components/EmptyState";
import { PortUtilities } from "./components/PortUtilities";
import { HistoryPanel } from "./components/HistoryPanel";
import { EnvironmentEditor } from "./components/EnvironmentEditor";
import { SettingsPanel } from "./components/SettingsPanel";
import { SSHKeyManager } from "./components/SSHKeyManager";
import { TunnelGroupPanel } from "./components/TunnelGroupPanel";
import * as api from "./lib/api";
import { useProfileStore } from "./stores/profileStore";
import { useWorkspaceStore } from "./stores/workspaceStore";
import { useFolderStore } from "./stores/folderStore";
import { useEnvironmentStore } from "./stores/environmentStore";
import { useHistoryStore } from "./stores/historyStore";
import type { ConnectionProfile, NewConnectionProfile } from "./lib/types";

export default function App() {
  const [currentView, setCurrentView] = useState<SidebarView>("connections");
  const [searchQuery, setSearchQuery] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const pendingConnects = useRef<Set<string>>(new Set());
  const activeConnections = useRef<Set<string>>(new Set());
  const userDisconnects = useRef<Set<string>>(new Set());

  const {
    profiles,
    tunnelStates,
    selectedId,
    showForm,
    editingProfile,
    loadProfiles,
    setTunnelStates,
    updateTunnelState,
    select,
    showCreateForm,
    showEditForm,
    hideForm,
    createProfile,
    updateProfile,
    deleteProfile,
    connect,
    disconnect,
    importProfiles,
    exportProfiles,
  } = useProfileStore();

  const { activeWorkspaceId, loadWorkspaces } = useWorkspaceStore();
  const { folders, loadFolders, expandFolder } = useFolderStore();
  const { loadEnvironments, getActiveVariables } = useEnvironmentStore();
  const { recordEvent } = useHistoryStore();

  // Initialize on mount
  useEffect(() => {
    loadWorkspaces();
    loadProfiles();
    loadFolders("local");
    loadEnvironments("local");

    api.getTunnelStates().then(setTunnelStates);
    api.getRecentProfiles("local", 5).then(setRecentIds).catch(() => {});

    // Poll every 5s to sync with CLI and other running instances
    const poll = setInterval(() => {
      api.getTunnelStates().then(setTunnelStates);
      loadProfiles();
      loadFolders("local");
      loadEnvironments("local");
      api.getRecentProfiles("local", 5).then(setRecentIds).catch(() => {});
    }, 5000);

    const unlisten = api.onTunnelStateUpdate((state) => {
      updateTunnelState(state);
      const { profiles } = useProfileStore.getState();
      const { activeWorkspaceId } = useWorkspaceStore.getState();
      const { recordEvent } = useHistoryStore.getState();
      const profile = profiles.find((p) => p.id === state.profile_id);
      if (!profile) return;

      const isPending = pendingConnects.current.has(state.profile_id);
      const wasConnected = activeConnections.current.has(state.profile_id);
      const isUserDisconnect = userDisconnects.current.has(state.profile_id);

      if (state.status === "connected") {
        activeConnections.current.add(state.profile_id);
        if (isPending) {
          pendingConnects.current.delete(state.profile_id);
          recordEvent(activeWorkspaceId, state.profile_id, profile.name, "connect");
        } else if (wasConnected) {
          // reconnected after drop
          recordEvent(activeWorkspaceId, state.profile_id, profile.name, "reconnect", "Auto-reconnected");
        }
      } else if (state.status === "error") {
        activeConnections.current.delete(state.profile_id);
        if (isPending) {
          pendingConnects.current.delete(state.profile_id);
          recordEvent(activeWorkspaceId, state.profile_id, profile.name, "error", state.error ?? undefined);
        } else if (wasConnected) {
          recordEvent(activeWorkspaceId, state.profile_id, profile.name, "error", state.error ?? "Connection dropped");
        }
      } else if (state.status === "disconnected") {
        activeConnections.current.delete(state.profile_id);
        userDisconnects.current.delete(state.profile_id);
      } else if (state.status === "reconnecting") {
        if (wasConnected && !isUserDisconnect) {
          recordEvent(activeWorkspaceId, state.profile_id, profile.name, "reconnect", `Reconnecting (attempt ${state.reconnect_attempt})`);
        }
      }
    });
    return () => {
      clearInterval(poll);
      unlisten.then((fn) => fn());
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd+N: New connection
      if (meta && e.key === "n") {
        e.preventDefault();
        showCreateForm();
        setCurrentView("connections");
      }

      // Cmd+K: Open command palette
      if (meta && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }

      // Cmd+Shift+D: Disconnect all
      if (meta && e.shiftKey && e.key === "d") {
        e.preventDefault();
        handleStopAll();
      }

      // Enter to connect selected (when not in form)
      if (e.key === "Enter" && !showForm && selectedId) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && target.tagName !== "BUTTON") {
          e.preventDefault();
          const state = tunnelStates[selectedId];
          if (!state || state.status === "disconnected" || state.status === "error") {
            handleConnect(selectedId);
          }
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showForm, selectedId, tunnelStates]);

  const selectedProfile = profiles.find((p) => p.id === selectedId);
  const selectedTunnelState = selectedId ? tunnelStates[selectedId] : undefined;

  const handleCreate = useCallback(
    async (data: NewConnectionProfile) => {
      await createProfile(data);
    },
    [createProfile],
  );

  const handleUpdate = useCallback(
    async (data: ConnectionProfile) => {
      await updateProfile(data);
      if (data.folder_id) expandFolder(data.folder_id);
    },
    [updateProfile, expandFolder],
  );

  const handleConnect = useCallback(
    async (id: string) => {
      const profile = profiles.find((p) => p.id === id);
      if (!profile) return;

      // Check port availability before connecting
      try {
        const available = await api.checkPortAvailable(profile.local_port);
        if (!available) {
          const next = await api.findNextAvailablePort(profile.local_port);
          const useNext = confirm(
            `Port ${profile.local_port} is already in use.\n\nWould you like to use port ${next} instead?`
          );
          if (!useNext) return;

          // Update the profile with the new port
          const updated = { ...profile, local_port: next };
          await updateProfile(updated);
        }
      } catch {
        // If check fails (e.g. no backend), proceed anyway
      }

      // Pass active environment variables for substitution
      const envVars = getActiveVariables();
      const hasVars = Object.keys(envVars).length > 0;
      pendingConnects.current.add(id);
      await connect(id, hasVars ? envVars : undefined);
    },
    [profiles, connect, activeWorkspaceId, updateProfile, getActiveVariables],
  );

  const handleDisconnect = useCallback(
    async (id: string) => {
      const profile = profiles.find((p) => p.id === id);
      userDisconnects.current.add(id);
      await disconnect(id);
      if (profile) {
        await recordEvent(
          activeWorkspaceId,
          id,
          profile.name,
          "disconnect",
        );
      }
    },
    [profiles, disconnect, recordEvent, activeWorkspaceId],
  );

  const handleStopAll = useCallback(async () => {
    await api.stopAllTunnels();
    // Clear all tunnel states
    setTunnelStates({});
  }, [setTunnelStates]);

  const handleDuplicate = useCallback(
    async (profile: ConnectionProfile) => {
      const { id, created_at, updated_at, version, ...rest } = profile;
      const duplicate: NewConnectionProfile = {
        ...rest,
        name: `${profile.name} (copy)`,
      };
      await createProfile(duplicate);
    },
    [createProfile],
  );

  const handleTogglePin = useCallback(
    async (id: string) => {
      const profile = profiles.find((p) => p.id === id);
      if (!profile) return;
      if (profile.is_pinned) {
        await api.unpinProfile(id).catch(() => {});
      } else {
        await api.pinProfile(id).catch(() => {});
      }
      loadProfiles();
    },
    [profiles, loadProfiles],
  );

  const handleImportSshConfig = useCallback(async () => {
    try {
      const sshProfiles = await api.importSshConfig();
      if (sshProfiles.length === 0) {
        alert("No hosts found in ~/.ssh/config");
        return;
      }
      let imported = 0;
      for (const p of sshProfiles) {
        await createProfile(p);
        imported++;
      }
      alert(`Imported ${imported} host${imported !== 1 ? "s" : ""} from SSH config`);
    } catch (e) {
      alert(`SSH config import failed: ${e}`);
    }
  }, [createProfile]);

  const handleSwitchView = useCallback((view: SidebarView) => {
    setCurrentView(view);
  }, []);

  const activeCount = Object.values(tunnelStates).filter(
    (s) => s.status === "connected",
  ).length;

  const VIEW_TITLES: Record<string, string> = {
    groups: "Tunnel Groups",
    "port-tools": "Port Tools",
    history: "History",
    environments: "Environments",
    "ssh-keys": "SSH Keys",
    settings: "Settings",
  };

  const renderMainContent = () => {
    switch (currentView) {
      case "groups":
        return <TunnelGroupPanel profiles={profiles} tunnelStates={tunnelStates} />;
      case "port-tools":
        return <PortUtilities />;
      case "history":
        return <HistoryPanel workspaceId={activeWorkspaceId} />;
      case "environments":
        return <EnvironmentEditor />;
      case "ssh-keys":
        return <SSHKeyManager />;
      case "settings":
        return <SettingsPanel />;
    }

    // Default: connections view
    if (showForm) {
      return (
        <ConnectionForm
          editing={editingProfile}
          folders={folders}
          onSave={
            editingProfile
              ? (d) => handleUpdate(d as ConnectionProfile)
              : handleCreate
          }
          onCancel={hideForm}
        />
      );
    }

    if (selectedProfile) {
      return (
        <ConnectionDetail
          profile={selectedProfile}
          tunnelState={selectedTunnelState}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onEdit={() => showEditForm(selectedProfile)}
          onDelete={deleteProfile}
          onDuplicate={handleDuplicate}
        />
      );
    }

    return <EmptyState onAdd={showCreateForm} onImportSshConfig={handleImportSshConfig} />;
  };

  return (
    <>
    <div className="flex flex-col h-screen bg-bg">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            profiles={profiles}
            folders={folders}
            tunnelStates={tunnelStates}
            selectedId={selectedId}
            currentView={currentView}
            workspaceId={activeWorkspaceId}
            recentIds={recentIds}
            onSelect={(id) => {
              select(id);
              setCurrentView("connections");
            }}
            onAdd={() => {
              showCreateForm();
              setCurrentView("connections");
            }}
            onImport={importProfiles}
            onExport={exportProfiles}
            onSwitchView={handleSwitchView}
            onStopAll={handleStopAll}
            onImportSshConfig={handleImportSshConfig}
            onTogglePin={handleTogglePin}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <main className="flex-1 min-w-0 overflow-y-auto p-8">
            {currentView !== "connections" && (
              <div className="mb-6">
                <h1 className="text-lg font-semibold tracking-tight text-text-primary">
                  {VIEW_TITLES[currentView]}
                </h1>
                <div className="mt-2 h-px bg-border" />
              </div>
            )}
            {renderMainContent()}
          </main>
        </div>
        <StatusBar
          activeCount={activeCount}
          totalCount={profiles.length}
          profiles={profiles}
          tunnelStates={tunnelStates}
        />
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        profiles={profiles}
        tunnelStates={tunnelStates}
        onSelectProfile={(id) => {
          select(id);
          setCurrentView("connections");
        }}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onSwitchView={handleSwitchView}
        onNewConnection={() => {
          showCreateForm();
          setCurrentView("connections");
        }}
      />
    </>
  );
}
