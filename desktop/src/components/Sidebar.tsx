import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Download,
  Upload,
  Cable,
  Wrench,
  Clock,
  Zap,
  Search,
  X,
  StopCircle,
  FileCode2,
  MoreHorizontal,
  Settings,
  Key,
  Layers,
} from "lucide-react";
import { FolderTree } from "./FolderTree";
import { ConnectionItem } from "./ConnectionItem";
import { EnvironmentSwitcher } from "./EnvironmentSwitcher";
import type { ConnectionProfile, Folder, TunnelState } from "../lib/types";

export type SidebarView =
  | "connections"
  | "groups"
  | "port-tools"
  | "history"
  | "environments"
  | "ssh-keys"
  | "settings";

type SidebarTab = "pinned" | "all" | "recent";

interface SidebarProps {
  profiles: ConnectionProfile[];
  folders: Folder[];
  tunnelStates: Record<string, TunnelState>;
  selectedId: string | null;
  currentView: SidebarView;
  workspaceId: string;
  recentIds: string[];
  onSelect: (id: string) => void;
  onAdd: () => void;
  onImport: () => void;
  onExport: () => void;
  onSwitchView: (view: SidebarView) => void;
  onStopAll?: () => void;
  onImportSshConfig?: () => void;
  onTogglePin?: (id: string) => void;
  onConnect?: (id: string) => void;
  onDisconnect?: (id: string) => void;
  onEdit?: (profile: ConnectionProfile) => void;
  onDuplicate?: (profile: ConnectionProfile) => void;
  onDelete?: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const NAV_ITEMS: { id: SidebarView; icon: typeof Cable; label: string; bottom?: boolean }[] = [
  { id: "connections", icon: Cable, label: "Connections" },
  { id: "groups", icon: Layers, label: "Groups" },
  { id: "port-tools", icon: Wrench, label: "Port Tools" },
  { id: "environments", icon: Zap, label: "Environments" },
  { id: "history", icon: Clock, label: "History" },
  { id: "ssh-keys", icon: Key, label: "SSH Keys" },
  { id: "settings", icon: Settings, label: "Settings", bottom: true },
];

const TAB_ITEMS: { id: SidebarTab; label: string }[] = [
  { id: "pinned", label: "Pinned" },
  { id: "all", label: "All" },
  { id: "recent", label: "Recent" },
];

export function Sidebar({
  profiles,
  folders,
  tunnelStates,
  selectedId,
  currentView,
  workspaceId,
  recentIds,
  onSelect,
  onAdd,
  onImport,
  onExport,
  onSwitchView,
  onStopAll,
  onImportSshConfig,
  onTogglePin,
  onConnect,
  onDisconnect,
  onEdit,
  onDuplicate,
  onDelete,
  searchQuery,
  onSearchChange,
}: SidebarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const activeCount = Object.values(tunnelStates).filter(
    (s) => s.status === "connected",
  ).length;

  // Filter profiles by search query
  const filteredProfiles = searchQuery
    ? profiles.filter((p) => {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.bastion_host.toLowerCase().includes(q) ||
          p.ssh_user.toLowerCase().includes(q) ||
          (p.remote_host ?? "").toLowerCase().includes(q) ||
          String(p.local_port).includes(q) ||
          String(p.remote_port ?? "").includes(q) ||
          (p.k8s_resource ?? "").toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          folders.some((f) => f.id === p.folder_id && f.name.toLowerCase().includes(q))
        );
      })
    : profiles;

  // Three-tier filtering
  const pinnedProfiles = filteredProfiles.filter((p) => p.is_pinned);
  const recentProfiles = recentIds
    .map((id) => filteredProfiles.find((p) => p.id === id))
    .filter((p): p is ConnectionProfile => p != null)
    .slice(0, 5);

  useEffect(() => {
    if (showSearch) {
      searchRef.current?.focus();
    }
  }, [showSearch]);

  // When searching, show all results regardless of tab
  const isSearching = searchQuery.length > 0;

  const renderProfileList = (profileList: ConnectionProfile[], emptyMessage: string) => {
    if (profileList.length === 0) {
      return (
        <div className="px-3 py-6 text-center">
          <p className="text-[11px] text-text-muted">{emptyMessage}</p>
        </div>
      );
    }
    return (
      <div className="space-y-0.5">
        {profileList.map((p) => (
          <div key={p.id}>
            <ConnectionItem
              profile={p}
              tunnelState={tunnelStates[p.id]}
              isSelected={selectedId === p.id}
              onSelect={() => onSelect(p.id)}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* Icon Rail */}
      <div className="w-[52px] bg-rail border-r border-border flex flex-col items-center py-3 gap-1 flex-shrink-0">
        {NAV_ITEMS.filter((n) => !n.bottom).map(({ id, icon: Icon, label }) => {
          const isActive = currentView === id;
          return (
            <button
              key={id}
              onClick={() => onSwitchView(id)}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 group ${
                isActive
                  ? "bg-rail-active text-accent"
                  : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
              }`}
              title={label}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-rail-indicator rounded-r-full" />
              )}
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              {id === "connections" && activeCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-status-connected text-[9px] text-bg font-bold rounded-full flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        {NAV_ITEMS.filter((n) => n.bottom).map(({ id, icon: Icon, label }) => {
          const isActive = currentView === id;
          return (
            <button
              key={id}
              onClick={() => onSwitchView(id)}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 group ${
                isActive
                  ? "bg-rail-active text-accent"
                  : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
              }`}
              title={label}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-rail-indicator rounded-r-full" />
              )}
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
            </button>
          );
        })}
      </div>

      {/* Connection List Panel - only visible for connections view */}
      {currentView === "connections" && (
        <div className="w-64 bg-bg-elevated border-r border-border flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Connections
              </h2>
              <div className="flex gap-0.5">
                <button
                  onClick={() => {
                    setShowSearch(!showSearch);
                    if (showSearch) onSearchChange("");
                  }}
                  className={`focus-ring p-1.5 rounded-md cursor-pointer transition-colors duration-150 ${
                    showSearch
                      ? "text-accent bg-accent/10"
                      : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                  }`}
                  title="Search (⌘K)"
                >
                  <Search size={13} />
                </button>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className={`focus-ring p-1.5 rounded-md cursor-pointer transition-colors duration-150 ${
                      showMenu
                        ? "text-accent bg-accent/10"
                        : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                    }`}
                    title="More actions"
                  >
                    <MoreHorizontal size={13} />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-bg-elevated border border-border rounded-lg shadow-xl z-50 py-1">
                      {onImportSshConfig && (
                        <button
                          onClick={() => { onImportSshConfig(); setShowMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-colors text-left"
                        >
                          <FileCode2 size={13} />
                          Import SSH Config
                        </button>
                      )}
                      <button
                        onClick={() => { onImport(); setShowMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-colors text-left"
                      >
                        <Download size={13} />
                        Import JSON
                      </button>
                      <button
                        onClick={() => { onExport(); setShowMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-colors text-left"
                      >
                        <Upload size={13} />
                        Export
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search bar */}
            {showSearch && (
              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowSearch(false);
                      onSearchChange("");
                    }
                  }}
                  placeholder="Search connections..."
                  className="w-full pl-7 pr-7 py-1.5 bg-surface border border-border rounded-md text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <EnvironmentSwitcher />

            {/* Three-tier tabs */}
            {!isSearching && (
              <div className="flex gap-0.5 mt-2 bg-surface rounded-lg p-0.5">
                {TAB_ITEMS.map((tab) => {
                  const count =
                    tab.id === "pinned" ? pinnedProfiles.length :
                    tab.id === "recent" ? recentProfiles.length :
                    filteredProfiles.length;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 text-[10px] font-medium py-1.5 rounded-md transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? "bg-bg-elevated text-text-primary shadow-sm"
                          : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className="ml-1 text-text-muted">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2">
            {isSearching ? (
              // Search mode: show all matching profiles flat
              filteredProfiles.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <Search size={20} className="text-text-muted mx-auto mb-2" />
                  <p className="text-[11px] text-text-muted">No matching connections</p>
                </div>
              ) : (
                renderProfileList(filteredProfiles, "")
              )
            ) : activeTab === "pinned" ? (
              renderProfileList(pinnedProfiles, "No pinned connections. Right-click a connection to pin it.")
            ) : activeTab === "recent" ? (
              renderProfileList(recentProfiles, "No recent connections yet.")
            ) : (
              // All tab: show folder tree
              filteredProfiles.length === 0 && folders.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <Cable size={20} className="text-text-muted mx-auto mb-2" />
                  <p className="text-[11px] text-text-muted">No connections yet</p>
                </div>
              ) : (
                <FolderTree
                  folders={folders}
                  profiles={filteredProfiles}
                  tunnelStates={tunnelStates}
                  selectedId={selectedId}
                  workspaceId={workspaceId}
                  onSelectProfile={onSelect}
                />
              )
            )}
          </div>

          <div className="p-3 border-t border-border space-y-2">
            {activeCount > 1 && onStopAll && (
              <button
                onClick={onStopAll}
                className="focus-ring flex items-center justify-center gap-2 w-full py-1.5 px-3 bg-status-error/10 hover:bg-status-error/20 border border-status-error/20 text-status-error rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150"
              >
                <StopCircle size={13} />
                Stop All ({activeCount})
              </button>
            )}
            <button
              onClick={onAdd}
              className="focus-ring flex items-center justify-center gap-2 w-full py-2 px-3 bg-accent hover:bg-accent-hover text-bg rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-150"
            >
              <Plus size={15} />
              New Connection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
