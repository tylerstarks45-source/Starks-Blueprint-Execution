---
name: Numeric ID string-method bug
description: DB primary keys are integers (serial), not UUID strings; calling string methods directly on an id crashes.
---

All Drizzle table schemas in this project use `serial("id").primaryKey()` — integer auto-increment IDs, not UUID strings. Frontend code that does `someRecord.id.substring(...)` or `.slice(...)` directly on an `id` field will throw `TypeError: id.substring is not a function` whenever the id is a plain number coming through JSON.

**Why:** Numeric ids look like strings in mock/UUID-based codebases people are used to, so it's easy to assume `.id` is always safe to slice for a short display label. It isn't here.

**How to apply:** Whenever truncating or formatting a record's `id` for display, always coerce first: `String(record.id).substring(0,8)` / `String(record.id).slice(-6)`. Apply the same defensive `String(...)` wrap to any new "short id" display added anywhere in the app.
