---
name: Frontend auth token pattern
description: How to correctly read the JWT in React pages — AuthContext has no token field.
---

## Rule
In all React pages and fetch helper functions, read the JWT with:
```js
const token = localStorage.getItem('sbep_auth_token');
```

Never destructure `token` from `useContext(AuthContext)` — that field does not exist on the context value.

**Why:** AuthContext is a PocketBase shim wrapper. The token is stored in localStorage under `sbep_auth_token` by the shim's `authStore`. The context exposes `currentUser`, `login`, `logout`, etc. — but NOT a raw `token` property. Using `useContext(AuthContext).token` silently returns `undefined`, causing all API calls from that page to go out without an Authorization header (→ 401 Unauthorized).

**How to apply:**
- Every new page that calls `/api/*` should define a local `getAuthHeaders()` helper:
  ```js
  function getAuthHeaders() {
    const token = localStorage.getItem('sbep_auth_token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }
  ```
- Pass these headers to every `fetch()` call. Do NOT thread `token` as a prop through sub-components — call `getAuthHeaders()` at fetch time so it always reads the freshest value.
- Reference: `ConnectionsHubPage.jsx` line 10–12 is the canonical example in the codebase.
