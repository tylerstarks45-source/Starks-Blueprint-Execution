---
name: Orval path+query param name collision
description: TS2308 ambiguity when a new OpenAPI GET endpoint has both a path param and query params sharing the same generated name.
---

An OpenAPI `GET /resource/{id}` operation with both a path param and query params can generate a path-param zod object and a query-param type under the same `<OperationId>Params` name, causing a duplicate-export TS2308 error where both are re-exported via `export *`.

**Why:** the codegen's naming convention doesn't disambiguate path-param objects from query-param types when they derive from the same operationId.

**How to apply:** add the colliding name to the existing explicit re-export allowlist for this exact class of collision, rather than renaming the operation or restructuring exports.
