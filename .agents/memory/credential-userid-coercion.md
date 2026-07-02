---
name: Credential save userId type coercion
description: Frontend must send userId as a number to POST /api/user-credentials, not a string.
---

## Rule
Any frontend code calling `POST /api/user-credentials` must coerce `userId` with `Number(currentUser.id)` before sending. The Zod schema on the backend requires a number, not a numeric string, and rejects string userIds with a validation error that was previously being swallowed into a generic "failed to save" toast.

**Why:** `currentUser.id` (via the PocketBase shim / AuthContext) is not guaranteed to be a JS number by the time it reaches a form handler — it can arrive as a string depending on how it was threaded through props/state. This exact bug was found independently in two separate connector-management pages (`ConnectionsHubPage.jsx` and the older `SocialAccountsPage.jsx`), suggesting it's an easy trap for any new credential-saving UI too.

**How to apply:**
- When writing any new "connect a credential" form, coerce `userId` and surface the real backend error message (not a generic fallback) so this class of bug is visible immediately instead of silently failing.
