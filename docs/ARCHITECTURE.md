# Architecture

## High-Level Overview

Wayport is a desktop application that manages SSH port-forwarding tunnels. The repo is a
Cargo workspace with three Rust crates and a Next.js landing page.

```
wayport/
  ├── desktop/src-tauri/   Tauri v2 app backend (Rust)
  ├── desktop/src/          React 19 frontend (TypeScript)
  ├── cli/                  wayport CLI (Rust, Clap v4)
  └── crates/wayport-core/ Shared types and utilities
```

```
┌─────────────────────────────────────────────────────────────┐
│                        Wayport                             │
├─────────────────────────────────────────────────────────────┤
│                      React Frontend                         │
│  desktop/src/App.tsx                                        │
│  desktop/src/components/*.tsx                               │
│  desktop/src/stores/*.ts   (Zustand)                        │
│  - Sidebar with connection list                             │
│  - Connection form with SSH key picker                      │
│  - Live status indicators                                   │
│  - History panel, port utilities, env var editor            │
├─────────────────────────────────────────────────────────────┤
│                    Tauri IPC Layer                          │
│  Commands: list_profiles, create_profile, start_tunnel...   │
│  Events: tunnel-state-update (push from Rust backend)       │
├─────────────────────────────────────────────────────────────┤
│                     Rust Backend                            │
│  desktop/src-tauri/src/                                     │
│  TunnelManager  — spawns SSH, tracks status, reconnects     │
│  Store          — reads/writes config (SQLite via rusqlite) │
│  PortMonitor    — watches ports for process info            │
│  Commands       — IPC handlers                              │
├─────────────────────────────────────────────────────────────┤
│              System SSH (/usr/bin/ssh)                      │
│  - Honors ~/.ssh/config, SSH agent                          │
│  - Supports all OpenSSH features                            │
│  - Spawned per connection; managed by TunnelManager         │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Creating a Connection

```
User fills form
  ↓
onSave callback (React)
  ↓
invoke("create_profile", { profile })
  ↓
Tauri IPC → Rust backend
  ↓
commands::create_profile()
  ↓
Generate UUID, timestamp
  ↓
store.save_profiles([...existing, new])
  ↓
Persist to SQLite at ~/.config/Wayport/wayport.db
  ↓
Return profile to frontend
  ↓
React state updated, UI re-renders
```

### Starting a Tunnel

```
User clicks "Connect"
  ↓
invoke("start_tunnel", { profileId, envVars })
  ↓
commands::start_tunnel()
  ↓
Lookup profile by ID
Apply env var substitution (${VAR} in host/user/key fields)
  ↓
tunnel_manager.start_tunnel(profile, callback)
  ↓
[Async spawn in background thread]
  ├─ Emit state: Connecting
  ├─ Spawn: ssh -i <key> -L <local>:<remote> -N <user>@<host>
  ├─ Capture stderr into logs ring buffer (last 200 lines)
  ├─ TCP probe to localhost:<local_port> (max 10s)
  ├─ If port reachable: emit state: Connected
  └─ If failed/timeout: emit state: Error (with SSH stderr)
  ↓
Tauri event sent to frontend
  ↓
React listener updates tunnel state Map
  ↓
UI re-renders with green status indicator
```

### Auto-Reconnect

```
Process died
  ↓
TunnelManager detects exit
  ↓
If profile.auto_reconnect && previously Connected
  ├─ Set state: Reconnecting (attempt 1/10)
  ├─ Sleep: 2^attempt seconds (max 60s)
  ├─ Spawn SSH again
  ├─ If succeeds: reset attempt counter → state: Connected
  └─ If fails: increment attempt (or state: Error on max 10)
```

## State Management

### React Frontend

Zustand stores:

| Store | Purpose |
|-------|---------|
| `profileStore` | All saved profiles + CRUD |
| `tunnelStore` | Live tunnel states map |
| `historyStore` | Connection history log |
| `envStore` | Environment variable sets |

### Rust Backend

`TunnelManager` holds a `RwLock<HashMap<profile_id, ManagedTunnel>>`:

```rust
ManagedTunnel {
  process: Option<Child>,          // SSH process handle
  state: TunnelState,              // Current status
  logs: VecDeque<String>,          // Last 200 lines of SSH stderr
  reconnect_handle: Option<JoinHandle<()>>,
}
```

### Persistent Storage

SQLite database at `~/.config/Wayport/wayport.db`:

- `profiles` table — connection profiles
- `history` table — connection events with timestamps
- `environments` table — named env var sets

## SSH Process Management

### Spawning

```rust
Command::new("ssh")
  .args([
    "-i", "<identity_file>",
    "-L", "5433:target-host:5432",
    "-N",
    "-o", "ServerAliveInterval=15",
    "-o", "ServerAliveCountMax=3",
    "-o", "ExitOnForwardFailure=yes",
    "-o", "StrictHostKeyChecking=accept-new",
    "-p", "22",
    "user@bastion-host"
  ])
  .stdout(Stdio::null())
  .stderr(Stdio::piped())
  .spawn()
```

A background thread reads stderr into the logs ring buffer in real time.

### Verification

After spawn, the app runs a TCP probe:

```rust
TcpStream::connect(("127.0.0.1", local_port))
```

Retried every 500ms for up to 10 seconds.

### Cleanup

```rust
process.kill()  // SIGTERM on Unix; TerminateProcess on Windows
```

## IPC Commands

| Command | Input | Output |
|---------|-------|--------|
| `list_profiles` | — | `Vec<ConnectionProfile>` |
| `create_profile` | `profile` | `ConnectionProfile` |
| `update_profile` | `profile` | `ConnectionProfile` |
| `delete_profile` | `id` | `()` |
| `start_tunnel` | `profileId, envVars` | `()` |
| `stop_tunnel` | `profileId` | `()` |
| `stop_all_tunnels` | — | `()` |
| `get_tunnel_states` | — | `HashMap<id, TunnelState>` |
| `get_tunnel_logs` | `profileId` | `Vec<String>` |
| `export_profiles` | — | `path: String` |
| `import_profiles` | — | `count: u32` |
| `import_ssh_config` | — | `Vec<ConnectionProfile>` |
| `check_ssh` | — | `{ available, version }` |
| `find_next_available_port` | `port` | `u16` |

**Push events:**

| Event | Payload | When |
|-------|---------|------|
| `tunnel-state-update` | `TunnelState` | Status changes |

## CLI (`cli/`)

Built with Clap v4, shares types with `wayport-core`. Commands:

```
wayport ls [--tag]
wayport connect <name> [-d]
wayport disconnect <name>
wayport status
wayport scan <port>
wayport kill <port>
wayport add
wayport rm <name>
wayport export [--output]
wayport import <file>
wayport env list|set|unset
```

## Security Considerations

- SSH key paths stored, never key material
- System SSH handles all crypto — we never touch keys
- SQLite config is user-readable plaintext (no encryption yet)
- `StrictHostKeyChecking=accept-new` — trusts first-seen host keys, rejects changed keys

## Performance

| Operation | Latency |
|-----------|---------|
| App startup + config load | ~1s |
| Connect (spawn + TCP probe) | ~1s |
| UI render | ~100ms |
| Per-tunnel memory (SSH process) | ~30MB |

## Known Limitations

1. No system tray — app must stay open to maintain tunnels
2. No notifications on reconnect/failure
3. No encryption for stored configs
4. macOS is primary target; Windows/Linux tested but less polished
