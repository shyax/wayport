# Development

## Prerequisites

- **Node.js** 18+ — `node --version`
- **Rust** 1.77+ — install via [rustup.rs](https://rustup.rs)
- **OpenSSH** — standard on macOS/Linux; ships with Windows 10+

## Monorepo structure

```
wayport/
  Cargo.toml           Cargo workspace (desktop/src-tauri, cli, crates/wayport-core)
  desktop/             Tauri v2 desktop app
    src/               React 19 frontend
    src-tauri/         Rust backend
    package.json
    vite.config.ts
  cli/                 wayport CLI (Rust)
  crates/
    wayport-core/     Shared Rust types
  landing/             Next.js marketing site
  docs/                Architecture + development docs
```

## Running the desktop app

```bash
cd desktop
npm install
npm run dev          # starts Vite + Tauri dev mode with hot reload
```

The Tauri window opens automatically. Frontend at `http://localhost:5173`.

## Building for production

```bash
cd desktop
npm run build        # bundles frontend + compiles Rust, outputs .dmg/.exe/.AppImage
```

Output locations:
- **macOS** — `desktop/src-tauri/target/release/bundle/dmg/`
- **Windows** — `desktop/src-tauri/target/release/bundle/nsis/`
- **Linux** — `desktop/src-tauri/target/release/bundle/appimage/`

## Running the CLI

```bash
cargo build -p wayport-cli --release
./target/release/wayport --help
```

Or during development:
```bash
cargo run -p wayport-cli -- ls
cargo run -p wayport-cli -- status
```

## Running the landing page

```bash
cd landing
npm install
npm run dev          # http://localhost:3000
npm run build        # static export
```

## Rust workspace checks

Run from the repo root:

```bash
cargo check --workspace          # type-check all crates
cargo clippy --workspace         # lint
cargo fmt --all                  # format
cargo test --workspace           # run tests (few exist currently)
```

## Project files

### Frontend (`desktop/src/`)

| File | Purpose |
|------|---------|
| `App.tsx` | Root component, keyboard shortcuts, global state wiring |
| `components/Sidebar.tsx` | Connection list, search, SSH config import |
| `components/ConnectionDetail.tsx` | Detail view, duplicate, SSH logs |
| `components/ConnectionForm.tsx` | Create/edit form with tags, jump hosts |
| `components/PortUtilities.tsx` | Port scan/kill/monitor with multi-port support |
| `components/HistoryPanel.tsx` | Connection history with source badges |
| `stores/profileStore.ts` | Profile CRUD + tunnel connect/disconnect |
| `stores/historyStore.ts` | History log with error handling |
| `lib/api.ts` | Tauri `invoke()` wrappers for all commands |
| `lib/types.ts` | Shared TypeScript types |

### Backend (`desktop/src-tauri/src/`)

| File | Purpose |
|------|---------|
| `main.rs` | App entry point |
| `lib.rs` | Tauri setup, plugin registration, command handler list |
| `types.rs` | Data structures (`ConnectionProfile`, `TunnelState`) |
| `database.rs` | SQLite schema and CRUD via rusqlite |
| `store.rs` | High-level profile/history store |
| `tunnel_manager.rs` | SSH process lifecycle, logs buffer, auto-reconnect |
| `commands.rs` | All `#[tauri::command]` handlers |
| `port_utils.rs` | Port scanning, process lookup, port monitor manager |

### Config files

| File | Purpose |
|------|---------|
| `desktop/src-tauri/tauri.conf.json` | Window size, bundle targets, app identifier |
| `desktop/vite.config.ts` | Frontend build |
| `desktop/tsconfig.json` | TypeScript config |
| `Cargo.toml` | Workspace definition |

## Adding a feature

### 1. Define types

Update both sides:
- `desktop/src-tauri/src/types.rs` — Rust struct with `#[derive(Serialize, Deserialize)]`
- `desktop/src/lib/types.ts` — matching TypeScript type

### 2. Add Rust backend logic

- Add logic to the relevant `src-tauri/src/*.rs` file
- Add a `#[tauri::command]` function in `commands.rs`
- Register it in `lib.rs` under `invoke_handler!`

### 3. Add IPC binding

Add a wrapper in `desktop/src/lib/api.ts`:

```ts
export async function myNewCommand(param: string): Promise<string> {
  return invoke("my_new_command", { param });
}
```

### 4. Add UI

Add a React component in `desktop/src/components/` and call the API:

```ts
const result = await myNewCommand("value");
```

## Cutting a release

1. Update `CHANGELOG.md` — move items from `[Unreleased]` to a new version section
2. Bump version in `desktop/src-tauri/tauri.conf.json` (`"version"` field)
3. Commit: `git commit -m "chore: release vX.Y.Z"`
4. Tag and push: `git tag vX.Y.Z && git push origin main vX.Y.Z`
5. GitHub Actions (`.github/workflows/release.yml`) builds for all platforms and creates a draft release
6. Review the draft on GitHub, add release notes, publish

## Debugging

### SSH tunnel not connecting

1. Check SSH logs in the connection detail panel (collapsed by default)
2. Run the SSH command manually from your terminal to see raw output:
   ```bash
   ssh -i ~/.ssh/key -L 5433:target:5432 -N -v user@bastion
   ```
3. Check if the local port is already in use: `wayport scan 5433`

### Frontend not updating

- Tauri IPC calls are async — check browser devtools console for errors
- Tunnel state updates come via `listen("tunnel-state-update")` events, not polling

### Rust compile errors

- Run `cargo check --workspace` to see all errors at once
- Common issue: mismatched types between `types.rs` and `commands.rs` signatures

## Known issues

- No system tray — tunnels stop when the app closes
- `~/.ssh/config` import skips `ProxyJump` chains (only imports leaf hosts)
- Windows: SSH stderr capture may be delayed on some OpenSSH builds
