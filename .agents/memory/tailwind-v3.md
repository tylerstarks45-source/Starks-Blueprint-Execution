---
name: Tailwind v3 Lock
description: Frontend is locked to Tailwind CSS v3 — do NOT upgrade to v4 without a full migration
---

The Horizons source uses Tailwind v3 class syntax and config conventions. The pnpm catalog has `tailwindcss: "^4.x"` but `artifacts/web/package.json` overrides it with `"tailwindcss": "^3.4.17"`.

Config files: `artifacts/web/tailwind.config.js` (CJS, not .ts) and `artifacts/web/postcss.config.js`.

**Why:** Tailwind v4 has breaking changes (no `tailwind.config.js`, different plugin API, renamed utilities). Migrating 300+ JSX files would be a major project.

**How to apply:** Never run `pnpm add tailwindcss@latest` in the web artifact. If tailwindcss-animate is needed, import it as a plugin in tailwind.config.js.
