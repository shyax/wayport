# Wayport UX Redesign

> Competitive analysis + current app audit. 2026-04-11.

## Competitors Analyzed

| Tool | Strength | Steal This |
|------|----------|------------|
| **Termius** | Browser-like nav (Cmd+T, Cmd+K), horizontal tabs, Vault concept | Command palette, tab model, one-click group connect |
| **TablePlus** | Color-coded environments, welcome screen, constrained env tags | Environment colors (green=local, red=prod), double-click connect |
| **Beekeeper Studio** | 3-tier sidebar (Pinned/All/Recent), form IS onboarding | Pin/Recent/Saved tiers, Test Connection before save |
| **Royal TSX** | Credential inheritance from folders, session dashboard | Parent folder inherits credentials, translucent=inactive |
| **Core Tunnel** | Menu bar integration, tag-based organization | Tags > rigid folders, menu bar toggle |
| **Secure Pipes** | Zero-friction after setup | Menu bar as complement, not replacement |

---

## Current App Pain Points

### Critical
1. **Form complexity** — port mapping labels change per forwarding type, terminology is SSH-expert-only ("Remote Bind Port")
2. **Jump hosts grid** — doesn't scale on small screens, no hop numbering
3. **Env variable syntax** — `{{var}}` not well-signposted in forms
4. **Port conflict UX** — warns but still lets you save, then shows modal on connect

### Moderate
5. **Search** — Cmd+K doesn't auto-focus, doesn't search inside folders
6. **Folder deletion** — no indication what happens to child profiles
7. **Port tools table** — 7 columns overflow on narrow screens
8. **Empty states** — text-only, no illustrations or next-step suggestions

### Minor
9. **Sidebar type badges** (L/R/D) — not obvious to new users
10. **Status bar tunnel chips** — overflow with many tunnels
11. **History source colors** — no legend

---

## Top 5 Redesign Priorities

### 1. Three-tier sidebar (Beekeeper model)
Replace flat folder tree with:
```
Pinned      ← drag tunnels here for quick access
All         ← folders + search + environment switcher
Recent      ← last 5 connected, auto-populated
```
Add TablePlus-style color dots per environment (green=local, blue=staging, red=prod).

### 2. Command palette (Termius model)
Cmd+K opens fuzzy search across ALL tunnels, folders, actions. Like VS Code / Raycast.
- Type tunnel name → connect
- Type "settings" → open settings
- Type "scan 5432" → scan port

### 3. Menu bar quick-toggle
Complement the main window with a menu bar dropdown:
- Shows active tunnel count
- Click individual tunnel to toggle
- "Connect All" / "Disconnect All"
- "Show Wayport" to open main window

### 4. Environment color system (TablePlus model)
Constrained environment tags:
- Local (green)
- Development (blue)  
- Staging (yellow)
- Production (red)

Color appears as a persistent stripe on every tunnel card, sidebar item, and status bar chip. Prevents production mistakes.

### 5. SSH config auto-import as onboarding
First launch flow:
1. Detect `~/.ssh/config`
2. Show parsed entries: "We found 12 SSH hosts"
3. User checks which to import
4. One-click creates profiles
5. No competitor does this well — real differentiator

---

## Landing Page Redesign

### Current issues
- Generic feature cards
- No product screenshot or animation
- No social proof (no GitHub stars, no user logos)
- Light on personality

### Recommended structure (dark theme)

1. **Hero** — "SSH tunnels, managed." + animated product screenshot showing tunnel connect/disconnect + dual CTA: "Download for Mac" / "View on GitHub"
2. **Trust bar** — GitHub stars badge + "Free and open source" + platform icons
3. **Problem-oriented features** (not feature lists):
   - "Stop memorizing SSH commands"
   - "Tunnels that reconnect themselves"
   - "See what's on every port"
   - Each with side-by-side screenshot
4. **How it works** — keep the 3-step timeline, add screenshots
5. **Pricing** — single free tier, prominent "open source" badge
6. **Footer** — GitHub, changelog, docs links

### Design references
- Evil Martians study of 100 dev tool landing pages (2025)
- TablePlus platform switcher pattern
- Beekeeper security badges + video walkthrough CTA

---

## Information Architecture Changes

### Current
```
Sidebar (icon rail + connection list)
├── Connections view (form/detail/empty)
├── Port Tools (scan/kill/monitor tabs)
├── Environments
├── History
└── Settings
```

### Proposed
```
Sidebar (3-tier: pinned/all/recent)
├── Tunnels (renamed from Connections — clearer)
│   ├── Dashboard (active tunnel overview, aggregate stats)
│   ├── Detail panel (slide-over, not full replace)
│   └── Create/edit (modal or drawer, not page navigation)
├── Port Tools (keep, improve table responsiveness)
├── Keys & Credentials (new — consolidate from settings, Termius Vault model)
├── History (keep)
└── Settings (minimal: autostart, notifications, appearance only)
```

### Key interaction changes
- **Double-click** sidebar item to connect (TablePlus pattern)
- **Right-click** for context menu (edit, duplicate, delete, move to folder)
- **Drag-and-drop** between folders and between pinned/all sections
- **Inline rename** — click name to edit in place
- Connection detail as **slide-over panel**, not full page replacement — keeps list visible
