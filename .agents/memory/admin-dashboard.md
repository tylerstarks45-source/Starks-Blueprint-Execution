---
name: Admin dashboard contract & roles
description: Non-obvious constraints for the SBEP admin command center — where the real UI lives, why frontend-needed fields must be in the OpenAPI spec, and role handling.
---

# Admin command center

## The real admin UI is not the page
`/admin-dashboard` and `/admin/*` resolve to `pages/AdminDashboard.jsx`, which intentionally
delegates to `DashboardPage` so `DashboardRouter` renders `AdminDashboardLayout` for admin roles.
The substantive admin cards live under `components/dashboard/admin/`, NOT in the page file.
**Why:** a static placeholder page previously shadowed the real layout; delegation keeps one router.
**How to apply:** when editing admin UI, edit the `components/dashboard/admin/*` panels and the
router, not the thin page wrapper.

## Zod (.parse) strips any field absent from the OpenAPI schema
Route handlers run `serialize(rows)` then `Schema.parse(...)`. `.parse()` drops keys not declared
in the schema. So any field the frontend needs (e.g. `role` on platform-users) MUST be added to the
relevant schema in `lib/api-spec/openapi.yaml`, followed by codegen + API restart — otherwise it is
silently removed from the response even if the DB row has it.
**Why:** a missing `role` on the shared `User` schema made admin role badges render blank.
**How to apply:** before wiring a new field into admin UI, confirm it exists on the response schema
in `openapi.yaml`; if not, add it (additive/optional is safe on shared schemas) and regenerate.

## Admin role vocabulary must stay in lockstep
`SUPER_ADMIN`, `ADMIN`, and lowercase `admin` are all treated as admin across the stack:
backend `requireAdmin()` (DB-backed role lookup), `ProtectedAdminRoute`, and `DashboardRouter`.
**Why:** mismatched role strings between guard and router caused admins to be denied or shown the
wrong layout.
**How to apply:** if you add/rename an admin role, update all three places together. If ADMIN vs
SUPER_ADMIN ever need distinct privilege tiers, enforce that explicitly on mutation endpoints.

## DashboardRouter must read role from AuthContext, not DashboardContext
`DashboardRouter` decides admin-vs-user layout. Its admin check must use the *reactive* role from
`useAuth().currentUser.role`, NOT `useDashboard().role`. The `DashboardContext` role is seeded once
from `localStorage.userRole` at mount and only ever updated by a `/api/auth/me` fetch — so a fresh
admin login lands on the USER dashboard until a full page reload.
**Why:** two compounding bugs — (1) `DashboardContext` read `data.role` instead of the nested
`data.user.role` (`/api/auth/me` returns `{ user: {...} }`), so the server correction never fired;
(2) the localStorage seed is non-reactive, so it stays stale after login. `ProtectedAdminRoute` was
fine because it already uses `currentUserRole` from AuthContext.
**How to apply:** gate admin UI on `useAuth()` role (set in `updateReactState` from the shim's saved
`data.user`), which is correct and reactive. Treat any `/api/auth/me` consumer carefully — the
payload is wrapped in `{ user }`.

## Admin gating is now role-only (email allowlists removed)
`DashboardRouter.jsx`, `ProtectedAdminRoute.jsx`, and backend `requireAdmin()`/`isAdminRole()` all
gate purely on role (`SUPER_ADMIN`/`ADMIN`/`admin`/`FOUNDER_ADMIN`) — no hardcoded email allow-lists
remain in the live route-gating path. `ProtectedAdminRoute` was the actual enforcement point blocking
`/admin` and `/admin-dashboard` routes; it still had an `ADMIN_EMAILS` check even after
`DashboardRouter`'s allow-list was removed, so any admin not in that list bounced to `/dashboard`.
**Why:** two components independently gated the same admin surface; fixing one without the other left
the bug half-fixed. `SubscriptionGate.jsx` still has a leftover `ADMIN_EMAILS` array but is dead code
(not imported/used by any route) — leave it alone unless it gets wired up, in which case fix it too.
**How to apply:** when touching admin access control, grep for `ADMIN_EMAILS` across the whole `web`
package, not just the file you're already editing — the same bug pattern tends to be duplicated.
