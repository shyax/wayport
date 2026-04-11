# Contributing to Porthole

Thanks for your interest in contributing to Porthole! We welcome bug reports, feature
requests, documentation improvements, and code contributions.

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.77+
- System `ssh` client
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)

### Monorepo Layout

```
porthole/
  ├── desktop/            # Tauri v2 desktop app (React + Rust)
  │   ├── src/            # React frontend (TypeScript + Tailwind)
  │   └── src-tauri/      # Rust backend
  ├── cli/                # porthole CLI (Rust)
  ├── crates/
  │   └── porthole-core/  # Shared Rust types and logic
  ├── landing/            # Marketing site (Next.js)
  └── docs/               # Architecture and development docs
```

### Running Locally

**Desktop app:**

```bash
cd desktop
npm install
npm run dev
```

**CLI:**

```bash
cargo build -p porthole-cli --release
```

**Landing page:**

```bash
cd landing
npm install
npm run dev
```

## How to Contribute

### Reporting Bugs

Open an issue with:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Your OS and Porthole version

### Suggesting Features

Open an issue tagged `enhancement`. Describe the **use case** — not just the feature —
so we can understand the problem being solved.

### Submitting Code

1. Fork the repo and create a branch from `main`.
2. Make your changes. Keep commits focused and atomic.
3. Run the checks before submitting:

```bash
# Rust
cargo check --workspace
cargo clippy --workspace -- -D warnings
cargo fmt --all -- --check
cargo test --workspace

# TypeScript (desktop)
cd desktop && npx tsc --noEmit
```

4. Open a pull request against `main`.
5. Fill out the PR template — describe what changed and why.

### Code Style

- **Rust:** Follow standard `rustfmt` formatting. Clippy must pass with no warnings.
- **TypeScript:** Strict mode enabled. No unused locals or parameters.
- **Commits:** Use concise, imperative messages (e.g., "Add profile export command").

### What Makes a Good PR

- Solves one problem. Don't bundle unrelated changes.
- Includes tests for new behavior when applicable.
- Updates docs if the change affects usage or architecture.
- Passes all CI checks.

## Questions

Open a GitHub Discussion for general questions rather than an issue.

## Releasing

Releases are managed by maintainers:

1. Update `CHANGELOG.md` under `[Unreleased]`
2. Bump the version in `desktop/src-tauri/tauri.conf.json`
3. Commit: `git commit -m "chore: release vX.Y.Z"`
4. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
5. GitHub Actions builds all platforms and creates a draft release
6. Review the draft, add release notes, publish
