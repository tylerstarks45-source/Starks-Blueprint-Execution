---
name: Business Command Center architecture
description: How the multi-business portfolio + per-business command center page is structured, and gotchas hit while building it.
---

## Structure
- `BusinessPortfolioPage.jsx` is the multi-business home (cards with revenue/connections/last-activity/health, filterable by origin).
- `BusinessCommandCenterPage.jsx` (route `/business/:id`) is the per-business detail view, replacing the old `/business-portfolio/:id` route (which now redirects via a `BusinessDetailRedirect` wrapper for backward compatibility with any bookmarked links).
- A business can be `origin=built` (auto-created from a `system_instance` via `backfillBuiltBusinesses()`, has `systemInstanceId` set) or `origin=imported` (manually created, `systemInstanceId` null). The command center must render meaningful empty/zero states for imported businesses with no linked system instance — there's no seeded data for this case, so it's easy to miss testing it.
- `GET /api/businesses/:id/overview` is the single endpoint portfolio cards and the command center both call for `{connectionsCount, revenueCents, lastActivityAt, healthStatus}` — avoid duplicating this aggregation logic elsewhere.
- Business switcher (`BusinessSwitcher.jsx`) mirrors the existing `ClientWorkspaceSwitcher` pattern and always renders in the sidebar (unlike the agency-gated client switcher).

**Why:** the platform models "businesses you built" and "businesses you imported" uniformly so the same dashboard UI works for both, but only `built` ones have rich system-instance data to show — the UI must degrade gracefully, not assume data exists.

**How to apply:** when adding new business-level metrics/sections, extend the `/overview` endpoint (or add a parallel single endpoint) rather than having the frontend stitch together multiple system-instance calls per business; always test with at least one `imported` business with zero connections/revenue to catch missing empty-state handling.
