---
name: Date Serialization
description: Drizzle returns Date objects but Zod output schemas expect strings — must serialize before every .parse()
---

Drizzle ORM returns JavaScript `Date` objects for `timestamp` columns. The Orval-generated Zod schemas (from OpenAPI spec, which uses string type for dates) throw ZodError "Expected string, received date" when you call `.parse(rows)` directly.

**Fix:** `artifacts/api-server/src/lib/serialize.ts` exports:
```ts
export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
```

This coerces Dates to ISO strings via JSON serialization.

**How to apply:** In every route handler, wrap DB output before passing to Zod:
```ts
// WRONG:
res.json(ListToolsResponse.parse(rows));

// CORRECT:
res.json(ListToolsResponse.parse(serialize(rows)));
```

All 15 existing route files were patched with a perl one-liner that adds the import and wraps all `.parse(varName)` calls with `serialize()`.

**Why:** The OpenAPI spec defines timestamps as `string` (ISO format) which is the correct wire format. Drizzle returns native Date objects internally. serialize() bridges this gap cheaply.
