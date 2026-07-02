---
name: Cross-device login "different account" reports
description: How to investigate a user reporting that logging in with the same credentials on a different device lands them in a different account.
---

When a user reports "same login, different account on another device", check in this order before assuming a backend bug:

1. **Case/whitespace duplicate emails** — query `SELECT email, count(*) FROM users GROUP BY lower(trim(email)) HAVING count(*) > 1`. If none, the accounts are technically distinct and correctly isolated at the DB level.
2. **Lookalike-but-distinct accounts owned by the same person** — search for other accounts with similar local-parts/names created close in time. Password managers/browser autofill on a different device can silently select a different saved-but-similar credential pair, which looks exactly like "the same login gives a different account" to the user even though there's no code defect.
3. **Client-side stale session bleed** — even if the backend is correct, a web client can render a previously-cached session (localStorage) without re-verifying it against the server, or fail to clear old session state before a new login completes. Harden defensively regardless of root cause:
   - Clear any cached auth state at the start of a new login attempt (before calling the login API), not just on success.
   - On app mount, re-verify a cached session against a `/me`-style endpoint and clear it if the server rejects it, rather than trusting `localStorage` indefinitely.
   - Show the authenticated email in the post-login success feedback so a user immediately notices if autofill picked the wrong account.
4. Add a case-insensitive unique index on `email` as a DB-level safety net even if no violation currently exists — cheap insurance against a future duplicate.

**Why:** the actual root cause is very often "user genuinely owns 2-3 similar email accounts and their device's password manager picked the wrong one," not a session/auth bug — but the client-side hardening above is worth doing anyway since it's cheap and closes a real (if rare) latent gap.
