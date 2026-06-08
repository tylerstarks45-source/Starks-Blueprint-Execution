---
name: FOUNDER_ADMIN role
description: How FOUNDER_ADMIN bypasses plan limits while still tracking usage; which files must be updated when roles change.
---

## Rule
FOUNDER_ADMIN bypasses all plan limits (credits, system count) but usage is still logged and deducted so analytics remain accurate. Never block a FOUNDER_ADMIN — check role before the blocking gate, not instead of logging.

**Why:** Tyler Starks needs to test the platform exactly as customers experience it (same production systems, same UI) while never being blocked by plan limits.

## Backend bypass pattern (3 files)
1. `lib/credits.ts → hasCredits()` — fetches role + balance in one query; returns `true` if `FOUNDER_ADMIN` before checking total.
2. `lib/openrouter.ts → complete()` — fetches role before credit gate; skips `OutOfCreditsError` for `FOUNDER_ADMIN` but still logs/deducts after call.
3. `routes/system-instances.ts POST /` — also selects `role` from userRow; wraps limit check in `if (!isFounder)`.

## Auth helper (1 file)
`lib/auth.ts` — `isFounderAdmin(role)` helper; FOUNDER_ADMIN added to `ADMIN_ROLES` set so `requireAdmin` middleware grants access.

## Frontend files that hardcode admin roles (8 total — ALL must be updated)
- `components/dashboard/DashboardRouter.jsx` — validRoles array + AdminDashboardLayout render condition
- `components/security/ProtectedAdminRoute.jsx` — ADMIN_ROLES const
- `middleware/adminRouteProtection.jsx` — ALLOWED const (appears twice)
- `pages/LoginPage.jsx` — redirect after login (appears twice: useEffect + handleSubmit)
- `pages/AdminPostsManagement.jsx` — access check (appears twice: useEffect + render guard)
- `components/Header.jsx` — isSuperAdmin boolean
- `components/dashboard/admin/AdminUserManagementPanel.jsx` — ROLE_OPTIONS array + badge color

## Account seeding
All 3 known Tyler accounts upgraded via SQL: `tylerstarks77@gmail.com`, `tylerstarks45@gmail.com`, `starksaiceo45@gmail.com` → role=FOUNDER_ADMIN, tier=empire, credits=1,000,000, wallet=500,000.

## How to apply
Any future role addition (e.g. MODERATOR) must touch all 8 frontend files above and the 3 backend bypass points if the new role also needs plan bypassing.
