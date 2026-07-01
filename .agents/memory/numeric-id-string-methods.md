---
name: Numeric ID string-method bug
description: DB primary keys are integers (serial), not UUID strings; calling string methods directly on an id crashes.
---

All Drizzle table schemas in this project use `serial("id").primaryKey()` — integer auto-increment IDs, not UUID strings. Frontend code that does `someRecord.id.substring(...)` or `.slice(...)` directly on an `id` field will throw `TypeError: id.substring is not a function` whenever the id is a plain number coming through JSON.

**Why:** This crashed `SavedSystemsPage.jsx` (`selectedSystem.id.substring(0,8)`) during a UI-truncation display, taking down the whole systems detail panel with a blank screen. The same pattern existed in `BuilderPage.jsx`, `DeploymentQueue.jsx`, and `ExecutionMonitor.jsx` for displaying short id labels.

**How to apply:** Whenever truncating or formatting a record's `id` for display, always coerce first: `String(record.id).substring(0,8)` / `String(record.id).slice(-6)`. When adding any new "short id" display anywhere in the app, apply the same `String(...)` wrap defensively — do not assume id is already a string.
