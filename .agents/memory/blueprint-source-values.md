---
name: Blueprint source values
description: Seeded/admin-created blueprints have source='admin'; frontend must treat 'admin' same as 'platform' for official blueprints.
---

## Rule
The `source` column on the `blueprints` table has three meaningful values: `'admin'`, `'platform'`, and `'community'`. All 8 seeded blueprints have `source='admin'` (the DB default at migration time). New platform-published blueprints may use `'platform'`. Community-submitted blueprints use `'community'`.

**Why:** The DB default was `'admin'` when the table was first created, so all existing rows carry that value. Changing them retroactively would require a data migration; instead, treat them equivalently in code.

**How to apply:**
- Visibility filter: `isOfficial = s => s === 'platform' || s === 'admin'`; show official blueprints always; show community only when `reviewStatus === 'approved'`.
- Source tabs: "Official" tab matches both `'platform'` and `'admin'` sources.
- Source badge map: include both `platform` and `admin` keys pointing to the same "Official" style.
- New admin-created blueprints via the submit route should use `source='platform'` to stay forward-compatible.
