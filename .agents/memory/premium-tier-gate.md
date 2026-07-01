---
name: Premium tier-gate pattern
description: How to gate a feature to a subset of paid tiers (stricter than the general free-vs-paid paywall), and who bypasses it.
---

Some features are gated to a subset of paid tiers (e.g. Operator + Empire only), not just "any paid tier." Don't reuse the general free-vs-paid `SubscriptionGate` check for these — it treats builder/starter/pro as paid, which is too permissive.

**Why:** Reusing the general paywall check silently under-gates stricter premium features, letting lower-tier subscribers access things they haven't paid for.

**How to apply:**
- Define an explicit allow-set of tiers for the feature (e.g. `new Set(["operator", "empire"])`), not an inverse of the free-tier set.
- Look up the user's `membershipTier` server-side and check membership; never trust a client-sent tier.
- `FOUNDER_ADMIN` role bypasses these gates project-wide (checked via `isFounderAdmin(role)` — strict string match on `"FOUNDER_ADMIN"`). `SUPER_ADMIN` does **not** get an automatic bypass — it's a different role and must independently meet the tier requirement.
- On failure, return 403 with a structured upgrade-prompt body (error message + machine-readable code + required tiers) so the frontend can render a locked/upgrade state instead of a generic error.
