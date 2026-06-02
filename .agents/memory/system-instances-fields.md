---
name: system_instances status fields
description: The system_instances API exposes buildStatus/healthStatus, not a single `status` field — several dashboard cards read the wrong key.
---

# system_instances status fields

The `system_instances` table/API exposes **`buildStatus`** (values seen: `pending` default, `building`, `active`) and **`healthStatus`** (`unknown` default, `healthy`). There is **no `status` field**.

**Why:** Several user-dashboard cards (e.g. UserActiveSystemsCard, UserMySystemsPanel, UserAutomationStatusCard) read `sys.status`, which is always `undefined`, so they silently fall back to "Draft"/"Not Started" and never reflect the real build state. New code computing active/running counts must read `buildStatus`.

**How to apply:** When filtering/displaying system state on the frontend, use `buildStatus` (and `healthStatus` for health). Treat `building`/`active` as in-progress/live. Don't trust `sys.status`.
