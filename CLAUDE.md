# Wayport

SSH port-forwarding tunnel manager. Tauri v2 + React 19 + Rust backend.

## Architecture

- **desktop/** — Tauri v2 app. React frontend in `src/`, Rust backend in `src-tauri/`.
- **cli/** — Rust CLI (`wayport`). Shares `wayport-core` crate with the desktop app.
- **crates/wayport-core/** — Shared types, SQLite database, tunnel manager, SSH config parser.
- **landing/** — Next.js marketing site. Self-contained (own `node_modules`).
- **infra/** — AWS infrastructure (Terraform) and Lambda sync handlers.

## Key patterns

- Frontend communicates with Rust via Tauri IPC (`invoke()` / `#[tauri::command]`).
- State management: Zustand stores in `desktop/src/stores/`.
- Styling: Tailwind CSS v4 with CSS custom properties for theming.
- Data: SQLite at `~/.config/Wayport/wayport.db`. CLI and desktop share the same DB.
- Auth: Optional Cognito OAuth. When `VITE_COGNITO_*` env vars are absent, the auth system is invisible.

## Running

```bash
# Desktop app (dev)
cd desktop && npm install && npm run tauri dev

# CLI
cargo build -p wayport-cli --release

# Landing page
cd landing && npm install && npm run dev

# Checks
cargo check --workspace
cargo clippy --workspace -- -D warnings
cd desktop && npx tsc --noEmit
```
