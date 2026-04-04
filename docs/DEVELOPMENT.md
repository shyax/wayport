# Development

## Running Locally

Start the dev server with hot reload enabled:

```bash
npm run dev
```

This will:
1. Start Vite dev server on http://localhost:5173
2. Compile and run the Tauri backend
3. Open the desktop app automatically

The app and Rust backend will hot-reload on file changes.

## Building for Production

### macOS

```bash
npm run build
npm run package:mac
```

Produces `Porthole.dmg` in `src-tauri/target/release/bundle/dmg/`.

### Windows

```bash
npm run build
npm run package:win
```

Produces installer in `src-tauri/target/release/bundle/nsis/`.

### Linux

```bash
npm run build
npm run package:linux
```

Produces AppImage in `src-tauri/target/release/bundle/appimage/`.

## Project Files

### Frontend (React + TypeScript + Tailwind)

- **src/App.tsx** — Root component with state management (useReducer)
- **src/components/** — UI components (Sidebar, Form, Detail, StatusBar)
- **src/lib/api.ts** — Tauri IPC bindings
- **src/lib/types.ts** — Shared TypeScript type definitions
- **src/index.css** — Global styles with CSS variables

### Backend (Rust + Tauri)

- **src-tauri/src/main.rs** — App entry point
- **src-tauri/src/lib.rs** — Tauri setup, state management, command registration
- **src-tauri/src/types.rs** — Data structures (ConnectionProfile, TunnelState)
- **src-tauri/src/store.rs** — Persistent config using JSON
- **src-tauri/src/tunnel_manager.rs** — SSH process lifecycle, auto-reconnect logic
- **src-tauri/src/commands.rs** — IPC command handlers

### Config

- **vite.config.ts** — Frontend build config
- **tsconfig.json** — TypeScript config
- **src-tauri/Cargo.toml** — Rust dependencies
- **src-tauri/tauri.conf.json** — Tauri app config (window size, bundle settings)

## Adding a Feature

### 1. Define Types

If adding a new feature (e.g., new field on profiles), update:
- `src-tauri/src/types.rs` — Rust struct
- `src/lib/types.ts` — TypeScript type

### 2. Add Rust Backend

- Add logic to `src-tauri/src/*.rs`
- Register a new `#[tauri::command]` in `src-tauri/src/commands.rs`
- Add to handler list in `src-tauri/src/lib.rs`

### 3. Add IPC Binding

Add wrapper in `src/lib/api.ts`:
```ts
export async function myNewCommand(param: string): Promise<string> {
  return invoke("my_new_command", { param });
}
```

### 4. Add UI

Add React component in `src/components/` and use the API:
```ts
const result = await myNewCommand("value");
```

## Testing

Currently no automated tests. Plan for Phase 2:
- Unit tests for tunnel manager (Rust)
- Integration tests for IPC commands
- E2E tests with Playwright

## Performance Notes

- SSH process spawning is intentionally synchronous on startup (ensures reliable connection)
- Tunnel state updates are async via Tauri events
- TCP probe is limited to 10s timeout with 500ms intervals (max 20 probes)
- Store uses JSON for simplicity; consider SQLite for large profile counts (>100)

## Known Limitations

- File picker not yet implemented (backend only)
- Import/export paths hardcoded to Downloads folder
- No encryption for SSH keys in config
- No system tray integration yet
- Dialog APIs not yet integrated with Tauri v2

These will be addressed in future phases.
