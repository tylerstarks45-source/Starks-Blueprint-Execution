---
name: OpenAPI date-time query params generate zod.date()
description: Why from/to date filters as query params must NOT use format:date-time in the OpenAPI spec
---

Query params declared as `type: string, format: date-time` make Orval generate `zod.date()` (not `zod.coerce.date()`) for the query-param zod schema. Express query values are always strings, so `zod.date()` rejects valid ISO strings and the route returns 400 — silently breaking date-range filters.

**Why:** Orval only coerces response-body date-time fields; for query params it emits a strict `zod.date()`. This is invisible until you actually pass a date value (empty/omitted params pass validation, so typecheck + basic curls look fine).

**How to apply:** For date-range query params (e.g. `from`/`to`), declare them as plain `type: string` (no `format`) in `lib/api-spec/openapi.yaml`. This generates `zod.coerce.string()`. Then convert to `Date` inside the route handler (guard `Number.isNaN(d.getTime())`). Response-body date fields can keep `format: date-time` — coercion there works correctly.
