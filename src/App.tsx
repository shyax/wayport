import { useEffect, useCallback } from "react";
import { Sidebar, type SidebarView } from "./components/Sidebar";
import { ConnectionDetail } from "./components/ConnectionDetail";
import { ConnectionForm } from "./components/ConnectionForm";
import { StatusBar } from "./components/StatusBar";
import { EmptyState } from "./components/EmptyState";
import { PortUtilities } from "./components/PortUtilities";
import { HistoryPanel } from "./components/HistoryPanel";
import { EnvironmentEditor } from "./components/EnvironmentEditor";
import { AuthGate } from "./components/AuthGate";
import * as api from "./lib/api";
import { useProfileStore } from "./stores/profileStore";
import { useWorkspaceStore } from "./stores/workspaceStore";
import { useFolderStore } from "./stores/folderStore";
import { useEnvironmentStore } from "./stores/environmentStore";
import { useHistoryStore } from "./stores/historyStore";
import type { ConnectionProfile, NewConnectionProfile } from "./lib/types";
import { useState } from "react";

export default function App() {
  const [currentView, setCurrentView] = useState<SidebarView>("connections");

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
  const { folders, loadFolders } = useFolderStore();
  const { loadEnvironments, getActiveVariables } = useEnvironmentStore();
  const { recordEvent } = useHistoryStore();

  // Initialize on mount
  useEffect(() => {
    loadWorkspaces();
    loadProfiles();
    loadFolders("local");
    loadEnvironments("local");

    api.getTunnelStates().then(setTunnelStates);

    const unlisten = api.onTunnelStateUpdate(updateTunnelState);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

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
    },
    [updateProfile],
  );

  const handleConnect = useCallback(
    async (id: string) => {
      const profile = profiles.find((p) => p.id === id);
      if (!profile) return;

      await connect(id);

      // Record history
      await recordEvent(
        activeWorkspaceId,
        id,
        profile.name,
        "connect",
      );
    },
    [profiles, getActiveVariables, connect, recordEvent, activeWorkspaceId],
  );

  const handleDisconnect = useCallback(
    async (id: string) => {
      const profile = profiles.find((p) => p.id === id);
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

  const handleSwitchView = useCallback((view: SidebarView) => {
    setCurrentView(view);
  }, []);

  const activeCount = Object.values(tunnelStates).filter(
    (s) => s.status === "connected",
  ).length;

  const VIEW_TITLES: Record<string, string> = {
    "port-tools": "Port Tools",
    history: "History",
    environments: "Environments",
  };

  const renderMainContent = () => {
    switch (currentView) {
      case "port-tools":
        return <PortUtilities />;
      case "history":
        return <HistoryPanel workspaceId={activeWorkspaceId} />;
      case "environments":
        return <EnvironmentEditor />;
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
        />
      );
    }

    return <EmptyState onAdd={showCreateForm} />;
  };

  return (
    <AuthGate>
      <div className="flex flex-col h-screen bg-bg">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            profiles={profiles}
            folders={folders}
            tunnelStates={tunnelStates}
            selectedId={selectedId}
            currentView={currentView}
            workspaceId={activeWorkspaceId}
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
          />
          <main className="flex-1 overflow-y-auto p-8">
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
        />
      </div>
    </AuthGate>
  );
}
