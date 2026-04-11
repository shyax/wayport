# Next Steps

## Ship the first release

```bash
git add .
git commit -m "chore: launch prep — CI, legal pages, docs, URL fixes"
git tag v0.1.0
git push origin main v0.1.0
```

GitHub Actions builds macOS (ARM + Intel), Windows, and Linux automatically and creates
a draft release. Review the draft on GitHub, add release notes, publish.

## macOS notarization

The release workflow has signing commented out. Without Apple Developer certs, macOS users
see a Gatekeeper warning (still works via right-click → Open, just not frictionless).

To enable notarization, add these secrets to the GitHub repo settings and uncomment them
in `.github/workflows/release.yml`:

- `APPLE_CERTIFICATE` — base64-encoded .p12
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY` — e.g. "Developer ID Application: ..."
- `APPLE_ID` — your Apple ID email
- `APPLE_PASSWORD` — app-specific password
- `APPLE_TEAM_ID`

## Deploy the landing page

`landing/` is a Next.js app, not deployed anywhere yet.

```bash
cd landing
npx vercel deploy
```

Or connect the repo to Vercel and set the root directory to `landing/`.

## Replace the waitlist mailto

Pro/Team CTAs in `landing/app/components/Pricing.tsx` currently send to:
`mailto:shyamsundarv.dev@gmail.com?subject=Wayport%20Pro%20waitlist`

Before getting real volume, replace with a proper form:
- [Tally](https://tally.so) (free, simple)
- [Typeform](https://typeform.com)
- Or a Supabase table with a small API route

Update the `href` in the `comingSoon` CTA in `Pricing.tsx`.

## Auto-updater

`tauri-plugin-updater` is not in the deps. Users won't know about new versions.

Add before v0.2.0:
1. `cd desktop && npm run tauri add updater`
2. Configure `updater.endpoints` in `tauri.conf.json` pointing to GitHub Releases JSON
3. Call `check()` on app startup and prompt user if update available

## CLI distribution

The CLI builds fine but there's no way for users to install it. Options:

- **GitHub Releases** — attach the `wayport` binary to each release (add to the workflow)
- **Homebrew** — write a formula and submit to homebrew-core, or host a tap
- **cargo install** — publish `wayport-cli` to crates.io (requires making the source available)

## Paid tier backend

When ready to build Pro/Team:

- Supabase is already in `desktop/package.json` — the client is ready
- Need: auth flow, profile sync table, subscription gate
- Stripe for payment processing
- The `comingSoon` flag in `Pricing.tsx` is all that needs to flip when features ship
