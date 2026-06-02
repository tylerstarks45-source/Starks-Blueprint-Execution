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
