---
name: Orval mutation hooks not generated in this repo
description: Why POST/PATCH/DELETE endpoints have no generated react-query hook in lib/api-client-react, and what to use instead.
---

Orval codegen in this repo only emits query hooks (`useListX`, `useGetX`) for GET endpoints. No mutation
hooks (`useCreateX`, `useUpdateX`, `useDeleteX`) are generated for POST/PATCH/DELETE paths, even though the
underlying fetcher functions and Zod body/param schemas are generated.

**Why:** the current Orval config/mustache templates in `lib/api-client-react` are scoped to query hooks only;
this isn't a bug in a specific spec, it's a repo-wide codegen convention (confirmed as of 2026-07 when adding
the businesses endpoints).

**How to apply:** for page-level mutations (create/update/delete), follow the existing frontend convention
already used in `ConnectionsHubPage.jsx` / `SystemsListPage.jsx`: call `fetch()` directly with
`Authorization: Bearer <sbep_auth_token>` headers, not a generated mutation hook. Only GET-backed lists/detail
views should use the generated `useListX`/`useGetX` hooks (and even those are often skipped in favor of raw
fetch + local state to match sibling pages).

Also: when an OpenAPI schema is referenced only as a nested/response field (e.g. a "connection" object nested
inside a "business with connections" response) and never appears as its own top-level request/response body,
Orval does not emit a standalone named Zod export for it — only the request Body/Params schemas get names. For
the route handler's response, either reuse the closest existing schema with a matching shape or return
`serialize(row)` unparsed rather than inventing a schema call that doesn't exist.
