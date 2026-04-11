# Wayport Implementation Plan

> Generated 2026-04-11. Ordered by impact and dependency chain.

## Phase 1: Launch Essentials (do before public release)

### 1.1 System Tray / Menubar Mode
**Why:** Tunnel managers must run in the background. Users will close the window and expect tunnels to keep running. This is table stakes.

**Changes:**
- **Rust (`desktop/src-tauri/`):**
  - `Cargo.toml` — add `tauri-plugin-system-tray` (or use Tauri v2 built-in tray API via `tauri::tray::TrayIconBuilder`)
  - `lib.rs` — build system tray with icon + menu (Show/Hide, Connect All, Disconnect All, separator, Quit)
  - `lib.rs` — on window close event: hide window instead of quitting (use `event.prevent_close()` + `window.hide()`)
  - `lib.rs` — tray icon click: toggle window visibility
  - `lib.rs` — update tray icon/tooltip based on tunnel count (e.g., "3 tunnels active")
- **Frontend (`desktop/src/`):**
  - No changes needed — tray is backend-only
- **Config:**
  - `tauri.conf.json` — add tray icon paths
  - `capabilities/default.json` — add tray permissions

**Files to create/modify:**
- `desktop/src-tauri/src/lib.rs` (modify)
- `desktop/src-tauri/Cargo.toml` (modify)
- `desktop/src-tauri/tauri.conf.json` (modify)
- `desktop/src-tauri/capabilities/default.json` (modify)
- `desktop/src-tauri/icons/tray-icon.png` (create — 22x22 template icon for macOS)
- `desktop/src-tauri/icons/tray-icon-active.png` (create — icon when tunnels are connected)

---

### 1.2 Launch at Login
**Why:** Users expect their tunnels to be available when they boot up. Pairs with system tray.

**Changes:**
- **Rust:**
  - `Cargo.toml` — add `tauri-plugin-autostart`
  - `lib.rs` — register autostart plugin with `MacosLauncher::LaunchAgent`
  - `commands.rs` — add `get_autostart_enabled()` and `set_autostart_enabled(enabled: bool)` commands
- **Frontend:**
  - Add a Settings panel/modal (or add to existing preferences)
  - Toggle switch: "Launch at login"
  - Wire to `get_autostart_enabled` / `set_autostart_enabled` IPC commands
- **Config:**
  - `capabilities/default.json` — add autostart permissions

**Files to create/modify:**
- `desktop/src-tauri/Cargo.toml` (modify)
- `desktop/src-tauri/src/lib.rs` (modify)
- `desktop/src-tauri/src/commands.rs` (modify)
- `desktop/src-tauri/capabilities/default.json` (modify)
- `desktop/package.json` (modify — add `@tauri-apps/plugin-autostart`)
- `desktop/src/components/SettingsPanel.tsx` (create)
- `desktop/src/stores/settingsStore.ts` (create)

---

### 1.3 Notifications
**Why:** When a tunnel drops or reconnects, users need to know without staring at the app.

**Changes:**
- **Rust:**
  - `Cargo.toml` — add `tauri-plugin-notification`
  - `lib.rs` — register notification plugin
  - `tunnel_manager.rs` — send notifications on state transitions:
    - Connected: "Tunnel '{name}' connected on port {port}"
    - Error: "Tunnel '{name}' failed: {error}"
    - Reconnecting: "Tunnel '{name}' dropped, reconnecting (attempt {n})..."
    - Reconnect exhausted: "Tunnel '{name}' gave up after 10 attempts"
  - `commands.rs` — add `get_notifications_enabled()` / `set_notifications_enabled()` using preferences table
- **Frontend:**
  - Add notification toggle to Settings panel
- **Config:**
  - `capabilities/default.json` — add notification permissions

**Files to create/modify:**
- `desktop/src-tauri/Cargo.toml` (modify)
- `desktop/src-tauri/src/lib.rs` (modify)
- `desktop/src-tauri/src/tunnel_manager.rs` (modify)
- `desktop/src-tauri/src/commands.rs` (modify)
- `desktop/src-tauri/capabilities/default.json` (modify)
- `desktop/src/components/SettingsPanel.tsx` (modify — add notification toggle)

---

### 1.4 Connection Test Button
**Why:** Users shouldn't have to "connect and hope" — let them validate SSH credentials before saving a profile.

**Changes:**
- **Rust:**
  - `commands.rs` — add `test_connection(profile: ConnectionProfile, env_vars: Option<HashMap>)`:
    - Build SSH command with `-o ConnectTimeout=10 -o BatchMode=yes`
    - Run with timeout, capture exit code + stderr
    - Return `{ success: bool, message: String, latency_ms: u64 }`
- **Frontend:**
  - Add "Test Connection" button to the profile create/edit form
  - Show spinner while testing, then green check or red error with message

**Files to create/modify:**
- `desktop/src-tauri/src/commands.rs` (modify)
- `desktop/src-tauri/src/lib.rs` (modify — register command)
- `desktop/src/components/ConnectionForm.tsx` or equivalent (modify)

---

## Phase 2: Polish & Competitive Parity

### 2.1 Tunnel Groups
**Why:** Developers often need 3-5 tunnels together (DB + cache + API + queue). Starting them individually is tedious.

**Changes:**
- **Database:**
  - New `tunnel_groups` table: `id, workspace_id, name, profile_ids (JSON array), sort_order, created_at, updated_at`
  - Migration in `database.rs`
- **Core types:**
  - `types.rs` — add `TunnelGroup` struct
- **Rust:**
  - `commands.rs` — CRUD commands: `list_groups`, `create_group`, `update_group`, `delete_group`
  - `commands.rs` — `start_group(group_id)`, `stop_group(group_id)` — batch start/stop
- **Frontend:**
  - Group management UI (create group, drag profiles into groups)
  - "Start Group" / "Stop Group" buttons
  - Group status indicator (all connected / partial / disconnected)
- **CLI:**
  - `wayport group ls` — list groups
  - `wayport group connect <name>` — start all tunnels in group
  - `wayport group disconnect <name>` — stop all

**Files to create/modify:**
- `crates/wayport-core/src/types.rs` (modify)
- `crates/wayport-core/src/database.rs` (modify)
- `desktop/src-tauri/src/commands.rs` (modify)
- `desktop/src-tauri/src/lib.rs` (modify)
- `desktop/src/components/TunnelGroupPanel.tsx` (create)
- `desktop/src/stores/groupStore.ts` (create)
- `cli/src/commands/group.rs` (create)
- `cli/src/main.rs` (modify)

---

### 2.2 Config-as-Code (YAML/TOML)
**Why:** Teams want to check tunnel configs into their repo. JSON export exists but isn't human-friendly.

**Changes:**
- **Core:**
  - `Cargo.toml` — add `serde_yaml` and `toml` dependencies
  - New module `crates/wayport-core/src/config_file.rs`:
    - `load_from_file(path) -> Vec<ConnectionProfile>` (detect format by extension)
    - `save_to_file(profiles, path, format)` (YAML or TOML)
    - Support `.wayport.yml` / `.wayport.toml` as convention
- **CLI:**
  - `wayport export --format yaml|toml|json --output path`
  - `wayport import path.yml`
  - `wayport sync path.yml` — reconcile file with database (additive merge)
- **Desktop:**
  - Export dialog: format dropdown (JSON, YAML, TOML)

**Files to create/modify:**
- `crates/wayport-core/Cargo.toml` (modify)
- `crates/wayport-core/src/config_file.rs` (create)
- `crates/wayport-core/src/lib.rs` (modify)
- `cli/src/commands/export.rs` (modify)
- `cli/src/commands/import.rs` (modify)
- `desktop/src-tauri/src/commands.rs` (modify)

---

### 2.3 SSH Key Management
**Why:** New users struggle with SSH keys. Helping them generate, view, and copy keys reduces onboarding friction.

**Changes:**
- **Rust:**
  - `commands.rs` — add:
    - `list_ssh_keys()` — scan `~/.ssh/` for key pairs, return names + types + fingerprints
    - `generate_ssh_key(name, key_type, passphrase?)` — run `ssh-keygen`
    - `get_public_key(name)` — read and return public key content (for copy to clipboard)
    - `copy_key_to_server(key_name, user, host, port?)` — run `ssh-copy-id`
- **Frontend:**
  - SSH Keys panel (list keys, generate new, copy public key button)
  - In profile form: dropdown of available keys instead of raw file path input

**Files to create/modify:**
- `desktop/src-tauri/src/commands.rs` (modify)
- `desktop/src-tauri/src/lib.rs` (modify)
- `desktop/src/components/SSHKeyManager.tsx` (create)
- `desktop/src/components/ConnectionForm.tsx` (modify — key selector dropdown)

---

### 2.4 Bandwidth / Traffic Stats
**Why:** "Is anything actually flowing through this tunnel?" is a common question. Even basic stats help.

**Changes:**
- **Rust:**
  - `tunnel_manager.rs` — track bytes via `/proc/net/tcp` (Linux) or `netstat`/`nettop` (macOS)
  - Alternative: periodically run `lsof -i :PORT` and parse connection states
  - Store `bytes_sent`, `bytes_received`, `connection_count` per tunnel in memory
  - Emit `tunnel-stats-update` event periodically (every 5s)
- **Frontend:**
  - Show traffic indicator on each tunnel card (e.g., "4.2 KB/s" or "2 active connections")
  - Expandable detail showing cumulative stats

**Files to create/modify:**
- `desktop/src-tauri/src/tunnel_manager.rs` (modify)
- `desktop/src-tauri/src/commands.rs` (modify)
- `desktop/src/components/TunnelCard.tsx` or equivalent (modify)

---

### 2.5 Terminal Integration
**Why:** After tunneling to a host, users often want to open a shell session too.

**Changes:**
- **Rust:**
  - `commands.rs` — add `open_terminal_session(profile_id)`:
    - Build SSH command without `-N` (allow shell)
    - macOS: `open -a Terminal "ssh ..."` or use iTerm2 if available
    - Windows: `start cmd /k ssh ...`
    - Linux: detect `gnome-terminal`, `xterm`, `kitty`, etc.
- **Frontend:**
  - Add "Open Terminal" button on each tunnel card (next to connect/disconnect)

**Files to create/modify:**
- `desktop/src-tauri/src/commands.rs` (modify)
- `desktop/src-tauri/src/lib.rs` (modify)
- `desktop/src/components/TunnelCard.tsx` or equivalent (modify)

---

### 2.6 kubectl Port-Forward Integration
**Why:** A huge portion of modern tunnel usage is Kubernetes. Supporting it makes Wayport relevant to k8s-native teams.

**Changes:**
- **Core types:**
  - `types.rs` — extend `ForwardingType` enum: `Local, Remote, Dynamic, Kubernetes`
  - Add optional fields to `ConnectionProfile`: `k8s_context`, `k8s_namespace`, `k8s_resource` (e.g., `svc/my-api`), `k8s_resource_port`
- **Database:**
  - Migration to add k8s columns to `connection_profiles`
- **Tunnel manager:**
  - `tunnel_manager.rs` — if `forwarding_type == Kubernetes`:
    - Spawn `kubectl port-forward --context ctx -n ns svc/name local:remote` instead of SSH
    - Same lifecycle management (auto-reconnect, status, logs)
- **CLI:**
  - `wayport connect <name>` works the same — the profile type determines the command
- **Frontend:**
  - Profile form: when type=Kubernetes, show k8s-specific fields (context, namespace, resource)
  - Auto-detect available contexts via `kubectl config get-contexts`

**Files to create/modify:**
- `crates/wayport-core/src/types.rs` (modify)
- `crates/wayport-core/src/database.rs` (modify — migration)
- `desktop/src-tauri/src/tunnel_manager.rs` (modify)
- `desktop/src-tauri/src/commands.rs` (modify — add `list_k8s_contexts`)
- `desktop/src/components/ConnectionForm.tsx` (modify)

---

## Phase 3: Distribution & Signing

### 3.1 macOS Notarization
**Why:** Without it, macOS users can't open the app without right-click > Open workaround.

**Changes:**
- **CI/CD (`.github/workflows/`):**
  - Set up `tauri-action` with notarization env vars:
    - `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`
    - `APPLE_SIGNING_IDENTITY`
    - `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`
  - `tauri.conf.json` — add `bundle.macOS.signingIdentity` and `bundle.macOS.providerShortName`
- **Prerequisites (manual):**
  - Apple Developer account ($99/year)
  - Create Developer ID Application certificate
  - Generate app-specific password for notarytool

**Files to create/modify:**
- `.github/workflows/release.yml` (create/modify)
- `desktop/src-tauri/tauri.conf.json` (modify)

---

### 3.2 Auto-Updater
**Why:** Users on v0.1.0 need a way to get v0.2.0 without manual download.

**Changes:**
- **Rust:**
  - `Cargo.toml` — add `tauri-plugin-updater`
  - `lib.rs` — register updater plugin, configure update endpoint
- **Frontend:**
  - Check for updates on launch (or periodically)
  - Show "Update available" banner with "Install & Restart" button
- **Backend infra:**
  - GitHub Releases as update source (Tauri supports this natively)
  - Or custom update endpoint (JSON file on S3/Vercel)
- **Config:**
  - `tauri.conf.json` — add updater config with public key and endpoints

**Files to create/modify:**
- `desktop/src-tauri/Cargo.toml` (modify)
- `desktop/src-tauri/src/lib.rs` (modify)
- `desktop/src-tauri/tauri.conf.json` (modify)
- `desktop/src/components/UpdateBanner.tsx` (create)
- `desktop/package.json` (modify — add `@tauri-apps/plugin-updater`)

---

### 3.3 Homebrew Distribution
**Why:** `brew install --cask wayport` is the expected install path for macOS developers.

**Changes:**
- Create a Homebrew tap repository (`homebrew-wayport`)
- Write cask formula pointing to GitHub Releases `.dmg`
- CI: auto-update cask SHA on new release

**Files to create (separate repo):**
- `homebrew-wayport/Casks/wayport.rb`

---

## Implementation Order

```
Phase 1 (launch blockers — do these first):
  1.1 System Tray          ← start here, highest impact
  1.2 Launch at Login       ← pairs with tray
  1.3 Notifications         ← pairs with tray
  1.4 Connection Test       ← standalone, quick win

Phase 2 (competitive features — next sprint):
  2.1 Tunnel Groups         ← most requested power-user feature
  2.2 Config-as-Code        ← team adoption driver
  2.3 SSH Key Management    ← onboarding friction reducer
  2.5 Terminal Integration  ← quick win, high utility
  2.6 kubectl Integration   ← opens k8s market
  2.4 Bandwidth Stats       ← nice-to-have, lower priority

Phase 3 (distribution — parallel with Phase 2):
  3.1 macOS Notarization    ← requires Apple Developer account
  3.2 Auto-Updater          ← after first notarized build
  3.3 Homebrew              ← after notarized releases exist
```
