---
name: Orval codegen only emits query hooks; mutations use raw fetch
description: Durable convention for how to call POST/PATCH/DELETE endpoints from the web frontend in this repo.
---

**Rule:** Orval codegen in this repo emits query hooks only (GET → `useListX`/`useGetX`). It does not emit
mutation hooks for POST/PATCH/DELETE. For any create/update/delete from the web frontend, call `fetch()`
directly with an `Authorization: Bearer <sbep_auth_token>` header — do not look for a generated
`useCreateX`/`useDeleteX` hook, and do not add one.

**Why:** the generated fetchers and Zod body/param schemas exist, but the hook templates are scoped to queries
by design. This matches the established page convention (e.g. ConnectionsHubPage, SystemsListPage), so raw
fetch keeps new pages consistent with siblings rather than introducing a one-off hook pattern.

**How to apply:** wire GET-backed lists/detail views with the generated query hooks (or raw fetch + local
state to match nearby pages); wire all mutations with raw fetch. Also: an OpenAPI schema referenced only as a
nested/response field (never its own top-level request/response body) gets no standalone named Zod export —
reuse the closest matching schema or return `serialize(row)` unparsed rather than inventing a nonexistent
schema call.
