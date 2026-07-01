---
name: System instance detail page naming trap
description: SystemDetailTemplate.jsx vs UserSystemDetailPage.jsx — don't confuse the blueprint marketing page with the live system instance page.
---

`artifacts/web/src/components/SystemDetailTemplate.jsx` renders the **blueprint marketing/instructions page** (per blueprint slug, shown to logged-out or prospective users) — it fetches from `pb.collection('blueprints')` and has no concept of a live `system_instances` row's runtime state.

The actual **live system instance detail page** — where build status, connectors, runtime controls, health, and monitoring live — is `artifacts/web/src/pages/UserSystemDetailPage.jsx` (large file, ~3300+ lines), keyed by `system_instances.id` via `useParams()`.

**Why:** both names sound like "the system detail page," and the template file is much shorter/more attractive to read first, but it's the wrong target for anything involving a user's actual running system.

**How to apply:** any feature tied to a specific `system_instances` row (health dashboards, runtime controls, connector status, activity logs) belongs in `UserSystemDetailPage.jsx`, not `SystemDetailTemplate.jsx`.
