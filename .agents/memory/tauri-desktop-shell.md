---
name: Tauri desktop shell gotchas
description: Pitfalls when scaffolding a Tauri v2 desktop app in the Replit sandbox
---

- Tauri's `generate_context!()` macro validates bundle icons at **compile time**. If any icon referenced in `tauri.conf.json`'s `bundle.icon` array is not RGBA (e.g. a plain sRGB PNG with no alpha channel), the build fails with `proc macro panicked: icon ... is not RGBA`. Always force RGBA before pointing Tauri at an icon, e.g. `magick icon.png -alpha on -define png:color-type=6 icon.png`.
- A "lightweight shell" that just wraps an existing web app doesn't need `frontendDist` to contain real content — point it at a placeholder directory (single inert `index.html`) and create the actual window in `main.rs`'s `.setup()` hook via `WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))`, reading the target URL from an env var (e.g. `DESKTOP_APP_URL`) so dev vs. prod targets are configurable without rebuilding.
- Remote-URL windows in Tauri v2 need a capability file (`src-tauri/capabilities/*.json`) with a `remote.urls` allow-list, or the webview's IPC bridge won't be granted permissions for that origin.
- First `cargo check`/`cargo build` on a fresh Tauri v2 project compiles ~300+ crates (webkit2gtk, wry, tao, etc.) and commonly takes several minutes — longer than a single sandboxed shell tool call's timeout. It is safe to just retry the same command; cargo's registry/build cache persists across calls and it resumes rather than restarting.
- System libs required to even get past `cargo check` on Linux: webkitgtk (4.1), gtk3, libsoup3, librsvg, glib, cairo, pango, gdk-pixbuf, atk, pkg-config, openssl.
