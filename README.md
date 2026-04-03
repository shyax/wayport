# Porthole

A lightweight, cross-platform desktop app for managing SSH port-forwarding tunnels. Save connection profiles, connect with one click, and share configs with your team.

## Features

- **Save & Recall Connections** — Store SSH tunnel profiles and reconnect with a single click
- **Multi-tunnel Support** — Run multiple SSH tunnels simultaneously with live status indicators
- **Auto-reconnect** — Automatically re-establish dropped tunnels with exponential backoff
- **Import/Export** — Share connection configs with teammates via JSON export
- **Cross-platform** — macOS, Windows, and Linux support via Tauri
- **Tiny Binary** — ~5-10MB download (vs. Electron's 150MB)

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4
- **Backend:** Rust + Tauri v2.10
- **Process Management:** System `ssh` binary (honors `~/.ssh/config`, SSH agent, all key formats)
- **Data Persistence:** JSON-based configuration in `~/.config/Porthole/`

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.77+ (install via [rustup.rs](https://rustup.rs))
- OpenSSH (standard on macOS/Linux; ships with Windows 10+)

### Development

```bash
# Install dependencies
npm install

# Start dev server (runs Tauri dev mode)
npm run dev

# Build for production
npm run build

# Build and package for macOS
npm run package:mac
```

The app will open at `http://localhost:5173` in dev mode, connected to the Rust backend.

## Project Structure

```
port-forwarding/
  ├── src/                          # React frontend
  │   ├── components/               # UI components
  │   │   ├── Sidebar.tsx
  │   │   ├── ConnectionForm.tsx
  │   │   ├── ConnectionDetail.tsx
  │   │   └── ...
  │   ├── lib/
  │   │   ├── api.ts               # Tauri command bindings
  │   │   └── types.ts             # Shared TypeScript types
  │   ├── App.tsx
  │   ├── main.tsx
  │   └── index.css
  ├── src-tauri/                    # Rust backend
  │   ├── src/
  │   │   ├── main.rs              # App entry point
  │   │   ├── lib.rs               # Setup and command handlers
  │   │   ├── types.rs             # Data structures
  │   │   ├── store.rs             # Persistent config storage
  │   │   ├── tunnel_manager.rs    # SSH process lifecycle
  │   │   └── commands.rs          # Tauri commands (IPC)
  │   ├── tauri.conf.json          # Tauri config
  │   └── Cargo.toml               # Rust dependencies
  ├── package.json
  ├── vite.config.ts
  └── tsconfig.json
```

## Architecture

### IPC Layer

React frontend communicates with Rust backend via Tauri commands:

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
| `export_profiles` | Export all profiles to JSON |
| `import_profiles` | Import profiles from JSON |
| `check_ssh` | Verify SSH availability on system |

**Push Events:**
- `tunnel-state-update` — Emitted when tunnel status changes (connecting, connected, reconnecting, error)

### SSH Process Management

The `TunnelManager` spawns system SSH processes with carefully tuned options:

```bash
ssh -i <key> -L <local>:<remote_host>:<remote_port> -N \
  -o ServerAliveInterval=15 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -o StrictHostKeyChecking=accept-new \
  <user>@<bastion>
```

**Key Features:**
- **TCP Probe Verification:** After spawn, the app probes `localhost:<local_port>` with TCP connect until the port is reachable (10s timeout). Confirms tunnel is working before marking "connected".
- **Automatic Reconnect:** When a tunnel drops, it retries with exponential backoff (2s base, up to 60s, max 10 attempts).
- **SSH Config Honored:** Uses system SSH binary, so `~/.ssh/config`, SSH agent, ProxyJump, and all OpenSSH features work automatically.

## Data Model

### ConnectionProfile

```typescript
{
  id: string;                    // UUID v4
  name: string;                  // User-facing name
  ssh_user: string;              // SSH username
  bastion_host: string;          // Bastion IP or hostname
  bastion_port: number;          // SSH port (default 22)
  identity_file: string;         // Path to SSH private key
  local_port: number;            // Local listening port
  remote_host: string;           // Target host (RDS endpoint, etc)
  remote_port: number;           // Target port
  auto_reconnect: boolean;       // Auto-reconnect on drop
  tags: string[];                // Optional labels
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
}
```

Profiles are persisted to `~/.config/Porthole/config.json` and can be exported/imported as JSON.

## License

MIT

## Contributing

Contributions welcome! Please fork and open a PR.
