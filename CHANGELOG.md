# Changelog

## [Unreleased]

### Bug Fixes

- **History panel stuck on "Loading..."** — Added error handling to the history store so it gracefully falls through to empty state when the backend is unavailable instead of showing a spinner forever.
- **Mobile responsive overflow** — Added `min-w-0` to the main content area so flex children shrink properly. Set minimum window size to 680x480 in Tauri config to prevent unusable layouts.

### New Features

#### Search & Filter (Sidebar)
- Toggle search bar with the magnifying glass button or `Cmd+K`
- Filters connections by name, bastion host, SSH user, and tags
- Shows "No matching connections" when search has no results
- `Escape` to dismiss search and clear query

#### Duplicate/Clone Connection
- New "Duplicate" button (copy icon) in the connection detail header
- Creates a copy with "(copy)" appended to the name
- All fields are preserved including jump hosts, tags, and settings

#### Port Conflict Detection
- Connection form checks port availability in real-time as you type
- Shows warning when a port is already in use
- On connect, checks port availability and offers to use the next free port with a confirmation dialog
- New `find_next_available_port` Rust backend command

#### SSH Config Import
- New sidebar button (file icon) to import hosts from `~/.ssh/config`
- Parses Host, HostName, User, Port, and IdentityFile directives
- Creates connection profiles tagged with "ssh-import"
- Skips wildcard (`*`) entries
- New `import_ssh_config` Rust backend command

#### Stop All Tunnels
- "Stop All" button appears in sidebar footer when 2+ tunnels are active
- Shows active tunnel count in the button
- Calls existing `stop_all_tunnels` backend command

#### Keyboard Shortcuts
- `Cmd+N` — New connection
- `Cmd+K` — Toggle search
- `Cmd+Shift+D` — Disconnect all tunnels

#### Environment Variable Substitution
- Active environment variables are now passed to the backend when starting a tunnel
- Variables substitute `${VAR_NAME}` patterns in: bastion host, SSH user, identity file, remote host, and jump host fields
- Enables one-click switching between staging/production by changing the active environment
- New `env_vars` parameter on `start_tunnel` backend command

#### SSH Logs / Stderr Viewer
- Collapsible "SSH Logs" panel in connection detail view
- Shows when tunnel is connected or in error state
- Captures SSH process stderr output in real-time (last 200 lines)
- Auto-refreshes every 3 seconds when expanded
- Better error messages: shows actual SSH stderr on tunnel failure instead of generic "port not reachable"
- New `get_tunnel_logs` backend command

#### Tags UI
- Tag input field in the connection form (comma or Enter to add, Backspace to remove)
- Tags displayed as colored chips in connection detail view
- Tags are searchable via the sidebar search

#### Port Tools Enhancements
- **Multi-port support** across all tabs (Scan, Kill, Monitor)
  - Tag-style port input: type ports separated by commas/spaces, shown as removable chips
  - Scan multiple ports at once with combined results
  - Kill processes on multiple ports with batch confirmation
  - Monitor multiple ports simultaneously with per-port sections
- **Quick port buttons**: Dev (3000), Postgres (5432), MySQL (3306), Redis (6379), HTTP (8080), Mongo (27017)
- **"My Tunnels" button**: Scan all ports used by currently active tunnels
- **"Stop All" button** for monitors when 2+ ports are being watched

### Files Changed

#### Frontend
- `src/App.tsx` — Search state, keyboard shortcuts, stop all, duplicate, SSH config import, port conflict on connect, env var passthrough
- `src/components/Sidebar.tsx` — Search bar, stop all button, SSH config import button, search/filter props
- `src/components/ConnectionDetail.tsx` — Duplicate button, tags display, SSH logs panel
- `src/components/ConnectionForm.tsx` — Tags input field
- `src/components/PortUtilities.tsx` — Multi-port support, quick port buttons, tunnel integration
- `src/components/HistoryPanel.tsx` — (unchanged, fix is in store)
- `src/stores/historyStore.ts` — Error handling on loadHistory
- `src/stores/profileStore.ts` — envVars param on connect
- `src/lib/api.ts` — New bindings: getTunnelLogs, importSshConfig, findNextAvailablePort, envVars on startTunnel

#### Backend (Rust)
- `src-tauri/src/commands.rs` — New commands: import_ssh_config, find_next_available_port, get_tunnel_logs; env_vars param on start_tunnel with apply_env_vars substitution
- `src-tauri/src/tunnel_manager.rs` — Logs buffer on ManagedTunnel, stderr capture thread, better error messages from SSH stderr
- `src-tauri/src/lib.rs` — Register new commands
- `src-tauri/tauri.conf.json` — minWidth/minHeight constraints

#### Config
- `CLAUDE.md` — Created with skill routing rules
