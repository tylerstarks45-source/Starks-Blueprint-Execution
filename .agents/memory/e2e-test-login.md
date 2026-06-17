---
name: E2E test login
description: How to authenticate for e2e/UI tests — the documented admin seed is stale; register a fresh user instead.
---

# E2E test login

The admin credentials documented in `replit.md` (`admin@starksglobalgroup.net`) do NOT exist in the dev database. Logging in with them fails with "Invalid email or password." The real privileged accounts are personal emails (one ADMIN, one SUPER_ADMIN) whose passwords are unknown.

**To authenticate in an e2e/UI test:** register a brand-new user via `POST /api/auth/register` (`{email, password, name}`) with a unique email, then log in with it. Login does NOT require email verification — it only checks the password hash and the `active` flag. New users get welcome credits and role `USER`, which is enough to view the dashboard and most user pages.

**Why:** repeated test runs failed at the login step because the seeded admin in the README was never inserted (or was later removed). Don't trust the README seed block for live credentials.

**How to apply:** any time a test or manual check needs an authenticated session, create a throwaway account first rather than reusing the documented seed credentials.
