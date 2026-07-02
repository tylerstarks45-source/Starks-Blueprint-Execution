---
name: Duplicate connector-management UIs
description: Two separate frontend pages manage the same credential backend; both need auditing together.
---

## Rule
`artifacts/web/src/pages/ConnectionsHubPage.jsx` (routed at `/connections`, the newer "Connections Hub") and `artifacts/web/src/pages/SocialAccountsPage.jsx` (routed at `/social-accounts`, older) are two independent frontend implementations that both call the same `/api/user-credentials` backend. They evolved separately and can drift out of sync with the real connector catalog and with each other.

**Why:** During a connector-health audit, the same class of bug (string vs. number `userId`) was found independently in both pages, and `SocialAccountsPage.jsx` still had a stale single-field YouTube entry long after the real 3-field YouTube connector shipped and `ConnectionsHubPage.jsx` was updated for it. Fixing one page does not fix the other.

**How to apply:**
- Whenever auditing, fixing, or extending connector/credential UX (new provider, new field, health/test indicators, error handling), check both pages, not just the one that first surfaces in the audit.
- Prefer steering new work toward `ConnectionsHubPage.jsx` (the more actively maintained, catalog-driven implementation) when adding a brand new connector, and only backport minimal parity fixes to `SocialAccountsPage.jsx`.
