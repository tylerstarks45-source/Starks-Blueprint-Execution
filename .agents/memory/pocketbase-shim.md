---
name: PocketBase Shim
description: Drop-in shim replacing PocketBase SDK — translates pb.collection() calls to SBEP REST API
---

The entire 300+ file Horizons frontend uses the PocketBase JS SDK pattern:
`pb.collection('blueprints').getFullList()`, `pb.collection('users').authWithPassword()`, etc.

Rather than rewriting every file, `artifacts/web/src/lib/pocketbaseClient.js` provides a class that mimics the PocketBase API surface but routes calls to the SBEP Express API.

**ENDPOINT_MAP** (as of last update):
- blueprints → /api/blueprints
- tools → /api/tools
- saved_systems / system_instances → /api/system-instances
- saved_tools / user_tool_selections → /api/user-tool-selections
- user_credentials → /api/user-credentials
- build_sessions → /api/build-sessions
- notifications / updates → /api/notifications
- contact_submissions → /api/contact
- blueprint_categories → /api/blueprint-categories
- tool_categories → /api/tool-categories
- affiliate_links → /api/affiliate-links
- build_progress → /api/build-progress
- build_outputs → /api/build-outputs
- user_memory → /api/user-memory

**Why:** Preserves the exact Horizons design/logic with zero JSX rewrites.

**How to apply:** When adding new API endpoints, always add a mapping to ENDPOINT_MAP in pocketbaseClient.js. Field names in the API are camelCase; the shim does NOT auto-convert them — if a page uses snake_case field access, map it explicitly in the collection's create/getList methods.
