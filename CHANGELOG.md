# Changelog

All notable changes to Wayport will be documented in this file.

## [Unreleased]

### Added

#### SSO Sign-In & Cloud Sync
- **OAuth SSO flow** — Sign in via Cognito hosted UI to sync profiles across devices
- **Deep link handler** — `wayport://auth/callback` receives OAuth redirect via `tauri-plugin-deep-link`
- **Token persistence** — Auth tokens saved to disk via Rust backend, auto-refreshed on expiry
- **Login screen** — AuthGate with "Sign in with SSO" and "Continue offline" options
- **Account section in Settings** — Shows signed-in email, sign out button
- **Cloud indicator in StatusBar** — Shows "Synced" or "Offline" status
- **Offline-first** — Without Cognito env vars, auth system is invisible; app works as local-only

#### Tunnel Groups
- Create named groups of tunnel profiles
- Start/stop all tunnels in a group with one click
- Groups panel in sidebar with dedicated view

#### Kubernetes Port-Forward
- New forwarding type: `kubectl port-forward` alongside SSH tunnels
- K8s context, namespace, resource, and port fields in connection form
- Kubernetes badge on connection items

#### SSH Key Management
- List SSH keys from `~/.ssh/`
- Generate new keys (ED25519, RSA, ECDSA) from the app
- View public key contents

#### Command Palette
- `Cmd+K` opens a searchable command palette
- Quick-connect to any tunnel, switch views, create new connections

#### Connection History
- Track connect, disconnect, reconnect, and error events with timestamps
- History panel in sidebar

#### Environment Variables
- Create named environments (staging, production, etc.) with key-value pairs
- Variables substitute `${VAR_NAME}` patterns in connection fields
- One-click environment switching

#### Config Import/Export
- Export profiles as JSON, YAML, or TOML
- Import from all three formats
- Import hosts from `~/.ssh/config`

#### Terminal Integration
- "Open Terminal" button on connected tunnels
- Opens system terminal with the SSH command pre-filled

#### Connection Testing
- "Test Connection" button to verify SSH connectivity before tunneling
- Shows latency and error details

#### System Tray
- Close to tray instead of quitting
- Tray menu: Show, Disconnect All, Quit
- Active tunnel count in tray tooltip
- Click tray icon to show window

#### UX Improvements
- **Human-friendly form labels** — Replaced SSH jargon with clear descriptions
- **Traffic flow diagram** — Visual port mapping in connection form
- **Hop numbering** — Jump hosts labeled "Hop 1 (first jump)", "Hop 2 (final jump)"
- **Responsive port tools table** — Columns hide at breakpoints
- **Status bar overflow** — Tunnel chips capped at 4 with "+N more"
- **Extended search** — Sidebar search matches remote hosts, ports, k8s resources, folders
- **Three-tier sidebar** — Pinned / All / Recent tabs
- **Connection pinning** — Right-click to pin frequently used connections
- **Drawer-based forms** — Create/edit slides in from the right
- **Tunnel dashboard** — Overview when no connection is selected

#### Port Utilities
- Multi-port scan, kill, and monitor
- Quick port buttons (3000, 5432, 3306, 6379, 8080, 27017)
- "My Tunnels" button to scan active tunnel ports
- Real-time port monitoring with notifications

#### Other
- Launch at login (macOS, Windows, Linux)
- Desktop notifications for tunnel connect/disconnect/error
- Port conflict detection with auto-suggest next available port
- SSH stderr log viewer per tunnel
- Tag input on connections (searchable)
- Duplicate/clone connections
- `Cmd+N` new connection, `Cmd+Shift+D` disconnect all
- Auto-reconnect with exponential backoff
- Single-instance enforcement

### Fixed

- **Landing page reload loop** — Decoupled landing from monorepo npm workspace; Turbopack was watching the entire repo tree via hoisted deps
- **History panel stuck on "Loading..."** — Error handling in history store
- **Mobile responsive overflow** — `min-w-0` on main content flex container
- **Ref hoisting** — `portCheckTimer` declared before `useEffect` cleanup references it

### Infrastructure

- AWS Cognito user pool + OAuth client (Terraform)
- API Gateway with Cognito authorizer
- Lambda sync handlers (push/pull/delete) with DynamoDB
- DynamoDB table with GSI for workspace queries and version-based optimistic concurrency
- GitHub Actions CI (Rust check + clippy + fmt + test, TypeScript check, landing build)
- GitHub Actions release (cross-platform Tauri builds on tag push)
