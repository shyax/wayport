# Contributing to Porthole

Thanks for your interest in Porthole. This is a proprietary project — we don't accept
external code contributions at this time. But bug reports and feature requests are very
welcome.

## Reporting Bugs

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your OS and Porthole version

## Feature Requests

Open an issue tagged `enhancement`. Describe the use case — not just the feature — so
we can understand the problem being solved.

## Questions

Open a GitHub Discussion rather than an issue for general questions.

---

### For internal contributors

#### Monorepo layout

```
porthole/
  ├── desktop/          # Tauri v2 desktop app (React + Rust)
  │   ├── src/          # React frontend (TypeScript + Tailwind)
  │   └── src-tauri/    # Rust backend
  ├── cli/              # porthole CLI (Rust)
  ├── crates/
  │   └── porthole-core/  # Shared Rust types and logic
  ├── landing/          # Marketing site (Next.js)
  └── docs/             # Architecture and development docs
```

#### Running the desktop app

```bash
cd desktop
npm install
npm run dev
```

Requires: Node.js 18+, Rust 1.77+, system `ssh`.

#### Running the landing page

```bash
cd landing
npm install
npm run dev
```

#### Building the CLI

```bash
cargo build -p porthole-cli --release
```

#### Running all Rust checks

```bash
cargo check --workspace
cargo clippy --workspace
cargo fmt --all
```

#### Cutting a release

1. Update `CHANGELOG.md` under `[Unreleased]`
2. Bump the version in `desktop/src-tauri/tauri.conf.json`
3. Commit: `git commit -m "chore: release vX.Y.Z"`
4. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
5. GitHub Actions builds all platforms and creates a draft release
6. Review the draft, add release notes, publish
