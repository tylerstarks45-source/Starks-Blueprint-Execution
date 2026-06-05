---
name: PocketBase shim auth
description: The pb shim handles auth correctly via REST API; AuthContext should NOT be rewritten
---

`artifacts/web/src/lib/pocketbaseClient.js` is a drop-in shim that routes:
- `pb.collection('users').authWithPassword()` → POST /api/auth/login, saves token to localStorage as `sbep_auth_token`
- `pb.collection('users').create()` → POST /api/auth/register
- `pb.authStore.model` → reads from `sbep_auth_user` in localStorage
- `pb.authStore.isValid` → checks `sbep_auth_token` + `sbep_auth_user`
- `pb.authStore.clear()` → removes both localStorage keys

**Why:** AuthContext.jsx uses `pb.authStore.onChange()` and `pb.collection('users').authWithPassword()` which both work through the shim. Rewriting AuthContext is unnecessary and risky.

**How to apply:** Leave AuthContext as-is. When other components need auth, read directly from localStorage (`sbep_auth_token`) or use `useAuth()` hook. For raw PocketBase collection calls in other files, replace with `fetch('/api/...')` instead.
