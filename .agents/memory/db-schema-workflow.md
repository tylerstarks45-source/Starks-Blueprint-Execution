---
name: DB schema change workflow
description: Required steps when adding columns to the Drizzle schema so TypeScript types update correctly
---

When adding columns to `lib/db/src/schema/*.ts`:

1. `pnpm --filter @workspace/db run push` — applies schema DDL to Postgres
2. `pnpm run typecheck:libs` — rebuilds the composite lib so new column types are emitted
3. `pnpm --filter @workspace/api-server run typecheck` — verifies API server picks up the new types

**Why:** `tsc --build` is incremental. Without step 2, the API server still sees the old shape and reports "property does not exist" errors even though the DB has the column.

**How to apply:** Always run all 3 steps after any schema change. Also: the `serialize()` wrapper must be applied before `.parse()` calls in any route handler that queries the updated table.
