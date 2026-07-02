# @workspace/desktop

A lightweight [Tauri](https://tauri.app) desktop shell that wraps the
`artifacts/web` app in a native window — no bundled frontend assets, just a
thin webview pointed at the live site (or a local dev server).

## How it works

The window is created programmatically in `src-tauri/src/main.rs` and loads
whatever URL is set in the `DESKTOP_APP_URL` environment variable, falling
back to `https://starksglobalgroup.net` if unset. `tauri.conf.json`'s
`frontendDist` points at a placeholder (`dist-shell/index.html`) purely to
satisfy Tauri's build requirements — it is never actually rendered.

## Requirements

- Rust (`rust-stable` module) + Cargo
- System libs: webkitgtk, gtk3, libsoup3, librsvg, glib, cairo, pango,
  gdk-pixbuf, atk (Linux/Replit — already provisioned in this workspace)

## Scripts

- `pnpm --filter @workspace/desktop run dev` — launch the shell pointed at
  `http://localhost:22333` (the `artifacts/web` dev server) by default.
  Override with `DESKTOP_APP_URL=<url> pnpm --filter @workspace/desktop run dev`.
- `pnpm --filter @workspace/desktop run build` — produce a native installer
  (AppImage/deb/msi/dmg depending on host OS) that points at the production
  URL (`https://starksglobalgroup.net`) by default. Override with
  `DESKTOP_APP_URL=<url>` at build time if you need a different target
  (the value is baked in via `std::env::var` read at process start, so it
  can also be overridden by setting the env var before launching the built
  binary).

## Notes

- This package is intentionally excluded from the root `tsconfig.json`
  project references (per `pnpm-workspace` conventions for leaf artifacts) —
  it has no TypeScript to typecheck.
- Building actual installers (`tauri build`) requires the full native
  toolchain for the target platform (e.g. `dpkg`/`rpm` tooling on Linux,
  Xcode on macOS, WiX on Windows) which may not all be present in every
  environment; `cargo check` is a fast way to verify the Rust code compiles
  without producing a full bundle.
