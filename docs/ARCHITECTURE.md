# Architecture

## High-Level Overview

Porthole is a desktop application that manages SSH port-forwarding tunnels. It consists of:

1. **Tauri Framework** — Bridges Rust backend and React frontend
2. **Rust Backend** — Spawns and manages SSH processes, persists config
3. **React Frontend** — Provides the UI for creating/managing connections

```
┌─────────────────────────────────────────────────────────────┐
│                        Porthole                       │
├─────────────────────────────────────────────────────────────┤
│                      React Frontend                         │
│  (src/App.tsx, src/components/*.tsx)                       │
│  - Sidebar with connection list                            │
│  - Connection form with SSH key picker                     │
│  - Live status indicators                                  │
│  - Export/Import buttons                                   │
├─────────────────────────────────────────────────────────────┤
│                    Tauri IPC Layer                          │
│  Commands: list_profiles, create_profile, start_tunnel...  │
│  Events: tunnel-state-update (push from backend)           │
├─────────────────────────────────────────────────────────────┤
│                     Rust Backend                            │
│  TunnelManager: Spawns SSH, tracks status                  │
│  Store: Reads/writes config.json                           │
│  Commands: IPC handlers that call TunnelManager/Store      │
├─────────────────────────────────────────────────────────────┤
│              System SSH (/usr/bin/ssh)                     │
│  - Honors ~/.ssh/config, SSH agent                         │
│  - Supports all OpenSSH features                           │
│  - Spawned per connection; managed by TunnelManager        │
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
save to ~/.config/Porthole/config.json
  ↓
Return profile to frontend
  ↓
React state updated, UI re-renders
```

### Starting a Tunnel

```
User clicks "Connect"
  ↓
invoke("start_tunnel", { profileId })
  ↓
commands::start_tunnel()
  ↓
Lookup profile by ID
  ↓
tunnel_manager.start_tunnel(profile, callback)
  ↓
[Async spawn in background thread]
  ├─ Emit state: Connecting
  ├─ Spawn: ssh -i <key> -L <local>:<remote> -N <user>@<host>
  ├─ TCP probe to localhost:<local_port> (max 10s)
  ├─ If port reachable: emit state: Connected
  └─ If failed/timeout: emit state: Error
  ↓
Tauri event sent to frontend
  ↓
React listener updates tunnel state Map
  ↓
UI re-renders with green status indicator
```

### Auto-Reconnect

When SSH process exits (detected via waitpid or process::close event):

```
Process died
  ↓
TunnelManager detects exit
  ↓
If profile.auto_reconnect && previously Connected
  ├─ Set state: Reconnecting (attempt 1/10)
  ├─ Sleep: 2 seconds (base delay * 2^(attempt-1))
  ├─ Spawn SSH again
  ├─ If succeeds: Reset attempt counter, state: Connected
  └─ If fails: Increment attempt, retry (or state: Error on max)
```

## State Management

### React Frontend

Uses `useReducer` + context pattern. State shape:

```typescript
{
  profiles: ConnectionProfile[];           // All saved profiles
  tunnelStates: Map<id, TunnelState>;     // Live status per profile
  selectedId: string | null;               // Currently selected connection
  showForm: boolean;                       // Show create/edit form
  editingProfile: ConnectionProfile | null; // Profile being edited
}
```

Actions dispatch to update state, triggering re-renders.

### Rust Backend

TunnelManager holds:
```rust
HashMap<profile_id, ManagedTunnel>
  ├─ process: Option<Child>           // SSH process handle
  ├─ state: TunnelState               // Current status
  └─ reconnect_timer: Option<Thread>  // Backoff timer (if reconnecting)
```

All mutation is protected by `RwLock`.

### Persistent Storage

JSON file at `~/.config/Porthole/config.json`:

```json
{
  "profiles": [
    {
      "id": "uuid",
      "name": "Staging Postgres",
      "ssh_user": "ec2-user",
      ...
    }
  ],
  "window_bounds": { "x": 100, "y": 200, "width": 1024, "height": 700 }
}
```

Loaded on app startup, updated whenever profile is created/updated/deleted.

## SSH Process Management

### Spawning

```rust
Command::new("ssh")
  .args([
    "-i", "<identity_file>",
    "-L", "5433:target-host:5432",     // Port forward
    "-N",                               // No remote command
    "-o", "ServerAliveInterval=15",    // Keepalive ping every 15s
    "-o", "ServerAliveCountMax=3",     // Exit after 3 missed pings (45s)
    "-o", "ExitOnForwardFailure=yes",  // Exit if -L bind fails
    "-o", "StrictHostKeyChecking=accept-new",
    "-p", "22",
    "user@bastion-host"
  ])
  .stdout(Stdio::null())
  .stderr(Stdio::piped())
  .spawn()
```

Key options:
- **ServerAliveInterval/CountMax**: SSH itself detects network failure and exits after 45s
- **ExitOnForwardFailure**: Catches port binding errors early (e.g., port in use)
- **StrictHostKeyChecking**: Accept new host keys but reject changed ones

### Verification

After spawn, the app runs a TCP probe:

```rust
TcpStream::connect(("127.0.0.1", local_port))
```

Retried every 500ms for up to 10 seconds. Success means tunnel is working.

### Cleanup

On stop or disconnect:
```rust
process.kill()
```

(Sending SIGTERM on Unix; TerminateProcess on Windows)

## IPC Commands

### Request-Response

| Command | Input | Output | Purpose |
|---------|-------|--------|---------|
| `list_profiles` | - | `Vec<ProfileProfile>` | Get all profiles |
| `create_profile` | `profile: Profile` | `profile: Profile` (with id/timestamps) | Add profile |
| `update_profile` | `profile: Profile` | `profile: Profile` (updated) | Modify profile |
| `delete_profile` | `id: String` | `()` | Remove profile & stop tunnel |
| `start_tunnel` | `profileId: String` | `()` | Spawn SSH |
| `stop_tunnel` | `profileId: String` | `()` | Kill SSH |
| `stop_all_tunnels` | - | `()` | Stop all active tunnels |
| `get_tunnel_states` | - | `HashMap<id, State>` | Get all tunnel statuses |
| `export_profiles` | - | `path: String` | Export to JSON file |
| `import_profiles` | - | `count: u32` | Import from JSON file |
| `check_ssh` | - | `{ available: bool, version: String }` | Verify SSH in PATH |

### Push Events

| Event | Payload | When |
|-------|---------|------|
| `tunnel-state-update` | `TunnelState` | Tunnel status changes |

Sent by backend, listened to by React via `listen()` hook.

## Error Handling

### SSH Failures

Capture stderr on spawn:
- Port already in use → "ExitOnForwardFailure=yes" causes SSH to exit with error
- Bad key → SSH error message captured and stored
- Host unreachable → Timeout/connection refused

Errors displayed in UI under the connection detail.

### Re-attempt Logic

On unexpected exit, check `profile.auto_reconnect`:
- If true: Start exponential backoff timer, re-spawn
- If false: Mark as error, stop retrying
- Max 10 attempts; after that, give up and show error

User can manually "Retry" which resets the counter.

## Security Considerations

### SSH Keys

- Paths stored as-is (e.g., `~/.ssh/id_rsa`)
- No key material in config (only path)
- SSH CLI is used (never our code handling keys)
- User's SSH agent is honored (can use passphrases, security keys)

### StrictHostKeyChecking

Set to `accept-new`:
- Trusts host key on first connection
- Rejects changed keys on subsequent connections
- Prevents MITM on subsequent uses (but not initial)

For production: Consider `known_hosts` validation or better host key management.

### Config Storage

- JSON in plaintext (no encryption)
- Located in `~/.config/` (user-readable)
- SSH key paths are relative to home or absolute

For sensitive deployments: Add encryption layer (see Phase 2/3 TODOs).

## Performance Characteristics

### Startup

- Read config.json: ~1ms
- Deserialize profiles: ~10ms (for 50 profiles)
- Render UI: ~100ms (React)

### Connection

- Spawn SSH: ~100ms
- TCP probe (success): ~500ms average
- **Total**: ~1s from click to "Connected"

### Memory

- Per tunnel: ~30MB (SSH process)
- Multiple tunnels: Roughly linear  add  30MB per connection
- Frontend: ~50MB (React + Tauri)

### Reconnect

- Backoff: 2s → 4s → 8s → 16s → 32s → 60s → 60s → ...
- Max cumulative duration: ~2 minutes (10 attempts)

## Scaling Limits

### Current Design Handles:

- **10+ simultaneous tunnels** without issue
- **100+ profiles** in config (though JSON parsing slows)
- **Long-lived connections** (days/weeks, depending on network)

### Future Optimizations:

- Replace JSON store with SQLite for >100 profiles
- Implement background process pooling (fork/spawn per tunnel family)
- Add system tray to reduce memory when minimized
- Lazy-load config sections

## Testing Strategy

### Unit Tests (Future)

- Tunnel manager: spawn/kill/reconnect logic
- Store: serialize/deserialize, CRUD operations
- TCP probe: timeout/retry behavior

### Integration Tests (Future)

- Create profile → export → import → verify data
- Start tunnel → network change → auto-reconnect detected
- Multiple tunnels: independent lifecycle

### E2E Tests (Future)

- UI flow: create → select → connect → see status
- Error handling: bad key → see error message
- Import/export: JSON validation

## Known Limitations & TODOs

1. **No file picker** — Select SSH key via text input (can type path)
2. **No encryption** — SSH keys stored in plaintext in config
3. **No system tray** — App must stay open to maintain tunnels
4. **No notifications** — No alerts on reconnect or failure
5. **No logging** — Debug output sent to stderr only
6. **Limited platforms** — macOS primary; Windows/Linux untested

See README and DEVELOPMENT.md for roadmap.
