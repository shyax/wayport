import { useEffect, useReducer, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { ConnectionDetail } from "./components/ConnectionDetail";
import { ConnectionForm } from "./components/ConnectionForm";
import { StatusBar } from "./components/StatusBar";
import { EmptyState } from "./components/EmptyState";
import * as api from "./lib/api";
import type {
  ConnectionProfile,
  NewConnectionProfile,
  TunnelState,
} from "./lib/types";

interface AppState {
  profiles: ConnectionProfile[];
  tunnelStates: Record<string, TunnelState>;
  selectedId: string | null;
  showForm: boolean;
  editingProfile: ConnectionProfile | null;
}

type Action =
  | { type: "SET_PROFILES"; profiles: ConnectionProfile[] }
  | { type: "SET_TUNNEL_STATES"; states: Record<string, TunnelState> }
  | { type: "UPDATE_TUNNEL_STATE"; state: TunnelState }
  | { type: "SELECT"; id: string | null }
  | { type: "SHOW_FORM"; editing?: ConnectionProfile }
  | { type: "HIDE_FORM" }
  | { type: "ADD_PROFILE"; profile: ConnectionProfile }
  | { type: "UPDATE_PROFILE"; profile: ConnectionProfile }
  | { type: "REMOVE_PROFILE"; id: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PROFILES":
      return { ...state, profiles: action.profiles };
    case "SET_TUNNEL_STATES":
      return { ...state, tunnelStates: action.states };
    case "UPDATE_TUNNEL_STATE":
      return {
        ...state,
        tunnelStates: {
          ...state.tunnelStates,
          [action.state.profile_id]: action.state,
        },
      };
    case "SELECT":
      return { ...state, selectedId: action.id, showForm: false };
    case "SHOW_FORM":
      return {
        ...state,
        showForm: true,
        editingProfile: action.editing ?? null,
      };
    case "HIDE_FORM":
      return { ...state, showForm: false, editingProfile: null };
    case "ADD_PROFILE":
      return {
        ...state,
        profiles: [...state.profiles, action.profile],
        selectedId: action.profile.id,
        showForm: false,
        editingProfile: null,
      };
    case "UPDATE_PROFILE":
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.profile.id ? action.profile : p,
        ),
        showForm: false,
        editingProfile: null,
      };
    case "REMOVE_PROFILE":
      return {
        ...state,
        profiles: state.profiles.filter((p) => p.id !== action.id),
        selectedId:
          state.selectedId === action.id ? null : state.selectedId,
        tunnelStates: Object.fromEntries(
          Object.entries(state.tunnelStates).filter(
            ([k]) => k !== action.id,
          ),
        ),
      };
    default:
      return state;
  }
}

const initialState: AppState = {
  profiles: [],
  tunnelStates: {},
  selectedId: null,
  showForm: false,
  editingProfile: null,
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    api.listProfiles().then((profiles) =>
      dispatch({ type: "SET_PROFILES", profiles }),
    );
    api.getTunnelStates().then((states) =>
      dispatch({ type: "SET_TUNNEL_STATES", states }),
    );

    const unlisten = api.onTunnelStateUpdate((tunnelState) => {
      dispatch({ type: "UPDATE_TUNNEL_STATE", state: tunnelState });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const selectedProfile = state.profiles.find(
    (p) => p.id === state.selectedId,
  );
  const selectedTunnelState = state.selectedId
    ? state.tunnelStates[state.selectedId]
    : undefined;

  const handleCreate = useCallback(
    async (data: NewConnectionProfile) => {
      const profile = await api.createProfile(data);
      dispatch({ type: "ADD_PROFILE", profile });
    },
    [],
  );

  const handleUpdate = useCallback(
    async (data: ConnectionProfile) => {
      const profile = await api.updateProfile(data);
      dispatch({ type: "UPDATE_PROFILE", profile });
    },
    [],
  );

  const handleDelete = useCallback(async (id: string) => {
    await api.stopTunnel(id).catch(() => {});
    await api.deleteProfile(id);
    dispatch({ type: "REMOVE_PROFILE", id });
  }, []);

  const handleConnect = useCallback(async (id: string) => {
    await api.startTunnel(id);
  }, []);

  const handleDisconnect = useCallback(async (id: string) => {
    await api.stopTunnel(id);
  }, []);

  const handleImport = useCallback(async () => {
    const count = await api.importProfiles();
    if (count > 0) {
      const profiles = await api.listProfiles();
      dispatch({ type: "SET_PROFILES", profiles });
    }
  }, []);

  const handleExport = useCallback(async () => {
    await api.exportProfiles();
  }, []);

  const activeCount = Object.values(state.tunnelStates).filter(
    (s) => s.status === "connected",
  ).length;

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          profiles={state.profiles}
          tunnelStates={state.tunnelStates}
          selectedId={state.selectedId}
          onSelect={(id) => dispatch({ type: "SELECT", id })}
          onAdd={() => dispatch({ type: "SHOW_FORM" })}
          onImport={handleImport}
          onExport={handleExport}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {state.showForm ? (
            <ConnectionForm
              editing={state.editingProfile}
              onSave={state.editingProfile ? handleUpdate : handleCreate}
              onCancel={() => dispatch({ type: "HIDE_FORM" })}
            />
          ) : selectedProfile ? (
            <ConnectionDetail
              profile={selectedProfile}
              tunnelState={selectedTunnelState}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onEdit={() =>
                dispatch({ type: "SHOW_FORM", editing: selectedProfile })
              }
              onDelete={handleDelete}
            />
          ) : (
            <EmptyState onAdd={() => dispatch({ type: "SHOW_FORM" })} />
          )}
        </main>
      </div>
      <StatusBar
        activeCount={activeCount}
        totalCount={state.profiles.length}
      />
    </div>
  );
}
