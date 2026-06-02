---
name: Auth Architecture
description: JWT auth using bcryptjs + jsonwebtoken; token stored in localStorage
---

Auth is handled by `artifacts/api-server/src/routes/auth.ts`:
- POST /api/auth/register — creates user with hashed password, returns JWT
- POST /api/auth/login — verifies password, returns { token, user }
- GET /api/auth/me — validates JWT, returns current user
- POST /api/auth/logout — client-side token removal
- POST /api/auth/request-reset — sends password reset (stub/email)

JWT signing uses `SESSION_SECRET` env var. Expiry: 7 days.

Token stored in localStorage as `sbep_auth_token`. User object stored as `sbep_auth_user`.

The `AuthStore` class in pocketbaseClient.js manages this storage and notifies listeners on change — mirroring PocketBase's authStore API.

**User roles:** USER (default), SUPER_ADMIN. Role stored in users.role column.

**Admin account:** admin@starksglobalgroup.net / Starks@Admin2024! (role=SUPER_ADMIN, tier=empire)

**Why:** Full PocketBase replacement requires a drop-in auth shim with the same API surface (authStore.model, authStore.isValid, authStore.onChange, authWithPassword, etc.).
