---
name: Heuristic monitoring vs AI health scoring
description: Two parallel health-scoring systems exist in SBEP; keep their tables, endpoints, and UI distinct.
---

SBEP has two independent health-scoring systems that must not be conflated:

1. **AI-driven business health** — `business_health_scores` table, `/api/businesses/:id/health` (+`/health/analyze`), surfaced by `HealthScoreCard.jsx`. Async, OpenRouter-analyzed, gives qualitative summary + opportunities/risks/recommendations.
2. **Heuristic monitoring** (per-dimension: connection/hosting/API/SEO/performance/security/revenue/automation) — `system_health_scores` + `business_health_metrics` tables, `/api/system-instances/:id/monitoring` and `/api/businesses/:id/monitoring` (+ `/recompute`), surfaced by `HealthDashboardCard.jsx`. Synchronous, computed from connector/job/queue state, drives whitelisted self-healing and Pending Approval escalation. Logged to `monitoring_log_events`.

**Why:** the two systems serve different purposes (subjective AI growth analysis vs. objective operational health) and were built in separate phases; merging their data models would break the self-healing gating logic which only cares about the heuristic scores.

**How to apply:** when adding new health-related UI or endpoints, use the `/monitoring` path suffix for heuristic/self-healing features and the `/health` path for AI-analysis features. Don't let one page's card show data from the wrong source.
