# Porthole

A lightweight, cross-platform desktop app for managing SSH port-forwarding tunnels.
Save connection profiles, connect with one click, and keep your tunnels alive automatically.

## Features

- **Save & recall connections** — Store SSH tunnel profiles and reconnect with a single click
- **Multi-tunnel support** — Run multiple SSH tunnels simultaneously with live status indicators
- **Auto-reconnect** — Automatically re-establish dropped tunnels with exponential backoff
- **Import / export** — Share connection configs with teammates via JSON export
- **SSH config import** — Import hosts directly from `~/.ssh/config`
- **Port utilities** — Scan, kill, and monitor ports; detect conflicts before connecting
- **Environment variables** — Substitute `${VAR}` in connection fields for staging/prod switching
- **CLI** — Manage tunnels from the terminal with `porthole` commands
- **Cross-platform** — macOS, Windows, and Linux via Tauri v2
- **Tiny binary** — ~5-10 MB download (vs. Electron's 150 MB)

## Download

Get the latest release for your platform from the
[GitHub Releases](https://github.com/shyax/porthole/releases) page.

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `Porthole_*_aarch64.dmg` |
| macOS (Intel) | `Porthole_*_x64.dmg` |
| Windows | `Porthole_*_x64-setup.exe` |
| Linux | `porthole_*_amd64.AppImage` |

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4
- **Backend:** Rust + Tauri v2
- **CLI:** Rust (Clap v4)
- **Shared core:** `porthole-core` crate
- **Process management:** System `ssh` binary (honors `~/.ssh/config`, SSH agent, all key formats)
- **Data persistence:** SQLite via `rusqlite` at `~/.config/Porthole/`

## Monorepo Layout

```
porthole/
  ├── desktop/                # Tauri v2 desktop app
  │   ├── src/                # React frontend
  │   │   ├── components/     # UI components
  │   │   ├── stores/         # Zustand state stores
  │   │   └── lib/            # Tauri IPC bindings + types
  │   └── src-tauri/          # Rust backend
  │       ├── src/
  │       │   ├── commands.rs      # Tauri IPC handlers
  │       │   ├── tunnel_manager.rs
  │       │   ├── store.rs
  │       │   ├── database.rs
  │       │   └── port_utils.rs
  │       └── tauri.conf.json
  ├── cli/                    # porthole CLI
  │   └── src/
  ├── crates/
  │   └── porthole-core/      # Shared types and logic
  ├── landing/                # Marketing site (Next.js)
  └── docs/                   # Architecture and development docs
```

## Development

### Prerequisites

- Node.js 18+
- Rust 1.77+ (via [rustup.rs](https://rustup.rs))
- OpenSSH (standard on macOS/Linux; ships with Windows 10+)

### Desktop app

```bash
cd desktop
npm install
npm run dev        # dev server with hot reload
npm run build      # production build + bundle
```

### CLI

```bash
cargo build -p porthole-cli --release
./target/release/porthole --help
```

### Landing page

```bash
cd landing
npm install
npm run dev
```

### All Rust checks

```bash
cargo check --workspace
cargo clippy --workspace
```

## IPC Commands

| Command | Purpose |
|---------|---------|
| `list_profiles` | Fetch all saved connection profiles |
| `create_profile` | Create a new connection profile |
| `update_profile` | Update an existing profile |
| `delete_profile` | Delete a profile and stop any active tunnel |
| `start_tunnel` | Spawn SSH process for a profile |
| `stop_tunnel` | Stop a specific tunnel |
| `stop_all_tunnels` | Stop all active tunnels |
| `get_tunnel_states` | Get current status of all tunnels |
| `get_tunnel_logs` | Fetch SSH stderr output for a tunnel |
| `export_profiles` | Export all profiles to JSON |
| `import_profiles` | Import profiles from JSON |
| `import_ssh_config` | Import hosts from `~/.ssh/config` |
| `check_ssh` | Verify SSH is available on the system |
| `find_next_available_port` | Find next free port after a given number |

**Push events:**
- `tunnel-state-update` — Emitted when tunnel status changes

## SSH Process Options

```bash
ssh -i <key> -L <local>:<remote_host>:<remote_port> -N \
  -o ServerAliveInterval=15 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -o StrictHostKeyChecking=accept-new \
  <user>@<bastion>
```

After spawn, Porthole TCP-probes `localhost:<local_port>` every 500ms (10s timeout)
to confirm the tunnel is working before marking it "Connected".

## Cutting a Release

1. Update `CHANGELOG.md`
2. Bump version in `desktop/src-tauri/tauri.conf.json`
3. Commit and tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
4. GitHub Actions builds all platforms and creates a draft release

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full release checklist.

## License

Copyright (c) 2026 Shyam Sundar. All rights reserved. See [LICENSE](LICENSE) for details.
