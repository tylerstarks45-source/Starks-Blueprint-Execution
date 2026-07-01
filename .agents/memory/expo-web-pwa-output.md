---
name: Expo mobile app's actual web output surfaces
description: Where PWA/meta-tag changes actually take effect for the mobile artifact's web presence, since there are two different web surfaces
---

The mobile artifact (`artifacts/mobile`) has two distinct "web" surfaces that are easy to conflate:

1. **Dev preview** (`services.development.run` → `expo start --localhost`): Metro serves the real React Native Web app directly. This is what you see in the Replit preview pane / dev domain during development.
2. **Production** (`services.production.run` → `server/serve.js`): `scripts/build.js` only builds **iOS/Android** Expo Go bundles (fetches `ios`/`android` manifests, never a web bundle). In production, `server/serve.js` serves a static `landing-page.html` (QR code + App/Play Store links to open in Expo Go) at `/` for browsers, and only returns platform manifests when the `expo-platform` header is present (i.e. requests from Expo Go).

**Why it matters:** Expo Router's `+html.tsx` root-HTML override and a `public/manifest.json` (the idiomatic way to add PWA meta tags/manifest) only apply to `expo export --platform web` / static web builds. They have **no effect** on either surface above — not the Metro dev server (which uses its own default HTML shell) and not the production landing page (which is a hand-rolled static template, unrelated to Expo's web export pipeline).

**How to apply:** If asked to add PWA support (theme-color, manifest, add-to-home-screen) for this app as currently architected, the actual reachable production surface is `server/templates/landing-page.html` — add the meta tags / inline data-URI manifest directly there. Still add `+html.tsx` + `public/manifest.json` too (correct for if/when a real `expo export -p web` pipeline is ever wired up), but don't assume they're live without a web export step existing in `build.js`/`serve.js`.
