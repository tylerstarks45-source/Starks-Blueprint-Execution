---
name: Orval path+query param name collision
description: TS2308 ambiguity when a new OpenAPI GET endpoint has both a path param and query params, and the fix pattern.
---

When an OpenAPI `GET /resource/{id}` operation has both a path parameter and query parameters, Orval generates:
- `generated/api.ts`: a zod object for the path params, named `<OperationId>Params`
- `generated/types/<operationId>Params.ts`: a TS type for the query params, with the SAME name

`lib/api-zod/src/index.ts` does `export * from "./generated/api"` and `export * from "./generated/types"`, so the duplicate name causes `error TS2308: Module has already exported a member named '<OperationId>Params'`.

**Why:** Orval's naming convention doesn't disambiguate path-param zod objects from query-param types when they share an operationId-derived name.

**How to apply:** Add the new operation's `<OperationId>Params` to the existing explicit re-export allowlist in `lib/api-zod/src/index.ts` (already handles `GetSystemLogsParams`, `GetBusinessLogsParams`, etc.) — this exports the zod path-param object explicitly and suppresses the ambiguous `export *` for that name. The query-param zod object remains available under its own `*QueryParams` name.
