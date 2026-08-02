# Build 047 — Unified Workspace & Project System (UWPS)
## Implementation Report
**Date:** 2026-08-02  
**Build:** 047  
**Phase:** IX — Platform Ecosystem  
**Status:** ✅ COMPLETE

---

## 1. Executive Summary

Build 047 establishes the **Unified Workspace & Project System** — the permanent organizational model for everything users build inside the Starks Global Group platform.

Users no longer think in terms of files. They think in terms of **Businesses**. Everything belongs to a Business. Everything inside a Business belongs to one or more Projects. Everything inside a Project is composed of Assets. Applications operate on Assets. ASH understands all relationships.

The full platform hierarchy is now enforced:

```
Organization → Business → Workspace → Project → Application → Asset → Version → Deployment
```

**Boot verification:** `extensionPoints: 350` (was 342 — 8 UWPS EPs added) ✅  
**TypeCheck:** 0 errors ✅  
**Unified Workspace Law:** enacted ✅

---

## 2. Files Created

**New schema file:**
- `lib/db/src/schema/unified_workspace.ts` — 10 UWPS tables

**New UWPS library (8 files):**
- `artifacts/api-server/src/lib/unified-workspace/types.ts` — all domain types, enums, EP IDs, `UWPS_THROTTLE_CYCLES=330`, built-in templates
- `artifacts/api-server/src/lib/unified-workspace/uwps-extension-points.ts` — 8 EP declarations
- `artifacts/api-server/src/lib/unified-workspace/business-org-engine.ts` — workspace lifecycle (create/list/archive/count)
- `artifacts/api-server/src/lib/unified-workspace/project-lifecycle-engine.ts` — project CRUD, templates, seeding, registry upsert
- `artifacts/api-server/src/lib/unified-workspace/asset-registry-engine.ts` — asset registration, listing, updating, version recording
- `artifacts/api-server/src/lib/unified-workspace/asset-relationship-engine.ts` — dependency graph, impact analysis, deletion safety
- `artifacts/api-server/src/lib/unified-workspace/workspace-activity-engine.ts` — append-only activity timeline
- `artifacts/api-server/src/lib/unified-workspace/project-health-engine.ts` — 6-dimension health scoring
- `artifacts/api-server/src/lib/unified-workspace/uwps-orchestrator.ts` — coordinator, maintenance cycle, workspace search, snapshots

**EB integration:**
- `artifacts/api-server/src/lib/executive-brain/uwps-integration.ts` — fetch/trigger/advisory

**REST routes:**
- `artifacts/api-server/src/routes/unified-workspace.ts` — 14 REST endpoints

---

## 3. Files Modified

| File | Change |
|------|--------|
| `lib/db/src/schema/index.ts` | Added `export * from "./unified_workspace"` |
| `artifacts/api-server/src/lib/cognitive-foundation/index.ts` | Added UWPS EP import + boot declaration call |
| `artifacts/api-server/src/lib/executive-brain/index.ts` | UWPS import, pre-warm, variable, fetch/trigger, buildContextNote wiring + advisory |
| `artifacts/api-server/src/lib/executive-brain/types.ts` | Added `uwpsSummary?` to `ExecutiveBrainResult` |
| `artifacts/api-server/src/lib/certification/types.ts` | MINIMUM_EP_COUNT: 342 → 350 |
| `artifacts/api-server/src/routes/index.ts` | Mounted `/workspace` router |

---

## 4. Database Schema

10 new tables (all created via raw SQL — drizzle-kit push not used):

| Table | Mutable? | Purpose | Key Columns |
|-------|---------|---------|-------------|
| `business_workspaces` | append+update | Workspace containers per business | `user_id`, `business_id`, `workspace_type`, `status` |
| `business_projects` | append+update | Projects inside workspaces | `user_id`, `workspace_id`, `project_type`, `status`, `phase` |
| `project_assets` | append+update | All registered platform assets | `project_id`, `asset_type`, `asset_status`, `deployment_status` |
| `asset_relationships` | append-only | Dependency graph between assets | `source_asset_id`, `target_asset_id`, `relationship_type`, `strength` |
| `asset_versions` | append-only | Version lineage for each asset | `asset_id`, `version`, `change_type` |
| `project_activity` | append-only | Workspace event timeline | `user_id`, `project_id`, `activity_type`, `actor` |
| `project_health` | append-only | Health score snapshots | `project_id`, `overall_score`, 6 dimension scores |
| `project_registry` | mutable | Per-project aggregate (upserted) | `project_id` (unique), `asset_count`, `health_score` |
| `workspace_snapshots` | append-only | Runtime workspace snapshots | `total_*`, `avg_health_score`, `law_applied` |
| `project_templates` | append+seed | Reusable project templates | `template_name`, `template_type`, `required_assets[]` |

**Indexes:** 21 indexes added covering `user_id`, `project_id`, `workspace_id`, `asset_type`, `asset_status`, `created_at DESC`.

---

## 5. Business Model

Business workspaces are the top-level grouping object for a business's work.

```
Organization
└── Business (existing businesses table)
    └── BusinessWorkspace (new: business_workspaces)
        ├── workspaceType: business | personal | team
        ├── status: active | archived | suspended
        └── → contains BusinessProject[]
```

**Key rule:** Every business can have multiple workspaces. Workspaces group related projects. The `business_id` links back to the existing platform `businesses` table — UWPS is non-destructive and additive.

**Built-in workspace types:**
- `business` — primary production workspace for a business
- `team` — shared workspace for a team within a business
- `personal` — private workspace for an individual user

---

## 6. Project Model

Projects are the unit of work. Everything a user builds belongs to a project.

```
BusinessWorkspace
└── BusinessProject
    ├── projectType: website | crm | automation | dashboard | saas | custom
    ├── phase: planning → building → testing → launched
    ├── status: active | archived | completed | suspended
    ├── tags: string[] — flexible categorization
    ├── templateId → optional template scaffold
    └── → contains ProjectAsset[]
```

**Project lifecycle:** `planning` → `building` → `testing` → `launched`. Each phase transition is recorded in the activity timeline. The Project Lifecycle Engine owns creation, archival, phase advancement, and template application.

**5 built-in templates seeded:**

| Template | Required Assets | Optional Assets |
|----------|----------------|-----------------|
| Website Project | website, brand_kit | landing_page, documentation, marketing_campaign, logo, image |
| CRM Project | crm | workflow, automation, dashboard, documentation |
| Automation Project | automation | workflow, ai_agent, prompt_library, documentation |
| SaaS Project | saas, database, api | website, dashboard, documentation, brand_kit, ai_agent, automation |
| Dashboard Project | dashboard | database, api, documentation, automation |

---

## 7. Asset Registry

The Asset Registry Engine registers every platform asset. 20 asset types are supported:

| Category | Asset Types |
|----------|-------------|
| Web | website, landing_page, saas |
| Workflow | workflow, automation, ai_agent |
| Data | database, api, dashboard |
| Content | documentation, knowledge_base, prompt_library, marketing_campaign |
| Brand | brand_kit, logo, image, video |
| Dev | source_code, document |
| Sales | crm |

**Registration is mandatory.** Every asset created by any builder must be registered in `project_assets`. The asset carries: owner, project, business, workspace, version, deployment status, external reference, and full metadata.

**Version recording is automatic.** Every `registerAsset()` call creates an initial `1.0.0` version record in `asset_versions`. Every `updateAsset()` call with a new version creates another record.

---

## 8. Asset Relationships

The Asset Relationship Engine maps dependencies and relationships between assets. ASH can traverse this graph to answer questions like "what assets depend on this?" and "can I safely delete this?"

**8 relationship types:**

| Type | Meaning |
|------|---------|
| `depends_on` | Source requires target to function |
| `uses` | Source consumes target |
| `extends` | Source builds on target |
| `replaces` | Source supersedes target |
| `references` | Source links to target |
| `generates` | Source produces target |
| `deploys_to` | Source is deployed to target |
| `documents` | Source documents target |

**3 relationship strengths:**
- `required` — removing the target breaks the source
- `optional` — removing the target degrades but doesn't break the source
- `informational` — reference only, no functional dependency

**Deletion impact check:** `checkDeletionImpact(assetId)` returns `{ safe, blockers, dependents }` so ASH can answer "can I safely delete this?" before any destructive operation.

**Broken dependency counting:** `countBrokenDependencies(projectId)` feeds directly into the project health engine's dependency score.

---

## 9. Project Health

The Project Health Engine computes a 6-dimension composite score (0–100) for each project.

### Scoring Model

| Dimension | Weight | Measurement |
|-----------|--------|-------------|
| Completeness | 30% | % of template-recommended asset types present |
| Activity | 15% | Recent events in last 14 days (capped at 100) |
| Dependency Health | 20% | 100 − (broken_required_deps × 20) |
| Deployment Readiness | 15% | % of assets in `deployed` status |
| Documentation Coverage | 10% | 80 if any documentation/knowledge_base asset exists |
| Automation Coverage | 10% | 80 if any automation/workflow/ai_agent asset exists |

**Overall = weighted composite of all 6 dimensions**

### Health Outputs

Each health computation produces:
- `overallScore` — single 0–100 number for quick comparison
- `missingAssets` — array of recommended asset types not yet present
- `healthWarnings` — actionable warnings (broken deps, no activity, etc.)
- `recommendations` — specific next steps for improvement

### Health Query Types

ASH can ask:
- "Which businesses are falling behind?" → `getAllProjectHealth(userId)` sorted by score
- "What is missing from this project?" → `health.missingAssets`
- "What should I build next?" → `health.recommendations[0]`

---

## 10. Activity Timeline

The Workspace Activity Engine records every meaningful event in an append-only timeline.

**Activity types recorded:**
- `workspace_created`, `project_created`, `project_archived`, `project_phase_advanced`
- `asset_added`, `asset_updated`, `asset_deployed`, `asset_deleted`, `asset_version_recorded`
- `dependency_added`, `health_computed`, `template_applied`, `snapshot_captured`

**Actors:**
- `user` — human-initiated action
- `ash` — ASH-initiated action
- `system` — automated background action

**Every event carries:** userId, workspaceId, projectId, assetId, businessId, actor, summary (human-readable), details (structured JSON).

The `activityScore` in the health engine is derived directly from `countRecentActivity(userId, 14)` — projects with no recent activity score lower and surface in ASH's attention.

---

## 11. ASH Integration

UWPS is integrated into the Executive Brain using the pre-warm pattern.

**Pre-warm (A-01 pattern):**
```typescript
const preWarmUWPS = fetchUWPSView(userId).catch((): UWPSSummary | undefined => undefined);
```
Runs concurrently with sequential LLM round-trips — zero added latency.

**Background trigger (fire-and-forget, 330-cycle throttle):**
```typescript
void Promise.resolve(triggerUWPSMaintenance(userId)).catch(err => logger.warn(...));
```
Every 330 EB cycles, UWPS runs maintenance: recomputes health for stale projects, captures workspace snapshot.

**Advisory in context note (every cycle):**
```
UWPS — Workspace: 2 workspace(s) | 5 project(s) (4 active) | 23 assets (8 deployed) | avg health 72/100 | Activity: 14 events in last 7 days | Low-health projects (need attention): CRM v2 (31/100)
```

**ASH can now answer:**
- "What is missing from this business?" → `missingAssets` from health
- "What should I build next?" → `recommendations` from health
- "What assets depend on this?" → `getAssetDependents(assetId)`
- "Can I safely delete this?" → `checkDeletionImpact(assetId)`
- "What businesses are falling behind?" → `getAllProjectHealth` sorted by score

---

## 12. REST API

14 endpoints mounted at `/api/workspace/*`:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/workspace/businesses` | user | Create business workspace |
| GET | `/workspace/businesses` | user | List workspaces (filter by businessId) |
| POST | `/workspace/projects` | user | Create project |
| GET | `/workspace/projects` | user | List projects (filter by businessId/workspaceId) |
| POST | `/workspace/assets` | user | Register asset in project |
| GET | `/workspace/assets` | user | List assets (filter by projectId/assetType) |
| POST | `/workspace/templates` | admin | Seed/refresh built-in templates |
| GET | `/workspace/activity` | user | Activity timeline (filter by projectId) |
| GET | `/workspace/health` | user | All project health scores |
| POST | `/workspace/health/compute` | user | Trigger health recompute for a project |
| GET | `/workspace/registry` | user | Project registry (sorted by health score ASC) |
| GET | `/workspace/search` | user | Cross-object search (projects/assets/workspaces) |
| GET | `/workspace/snapshots` | admin | Workspace snapshots |
| GET | `/workspace/summary` | user | UWPS platform summary |
| POST | `/workspace/initialize` | admin | Re-seed templates and capture snapshot |

---

## 13. Technical Decisions

**1. UWPS is additive to the existing `businesses` table**  
The existing `businesses` table is untouched. `business_workspaces.business_id` is a soft FK to it — no migration, no constraint. This prevents any risk to existing business data.

**2. `project_registry` is the only mutable table**  
Per the spec's "append-only except registry" rule. The registry is upserted on every project creation and health recompute, giving a single fast-read row per project with the current aggregate.

**3. Health scores are stored as integers (0–100)**  
Not floats. This makes comparison, sorting, and display trivial. Sub-point precision adds no value for health advisory.

**4. `ExtensionPointDefinition` only has `id`, `description`, `declaredBy`**  
Build 047 discovered that the `ExtensionPointDefinition` interface doesn't include `name`, `category`, `engineId`, or `version`. The UWPS EP declaration file was corrected to use only the actual interface fields.

**5. Auth imports come from `lib/auth` not `middleware/`**  
The project uses a single `lib/auth.ts` file exporting both `requireAuth` and `requireAdmin`. There is no `middleware/` directory.

**6. `requireAdmin` signature takes `(req, res, next)` — used as middleware**  
Checked existing usage in routes — `requireAdmin` is an Express middleware, not a function call.

---

## 14. Performance Impact

| Component | Impact |
|-----------|--------|
| EB pre-warm | UWPS summary runs concurrently with LLM calls — zero added latency |
| Background maintenance | Every 330 EB cycles — entirely off-request-path |
| Health computation | Runs on-demand via `POST /workspace/health/compute`; background only during UWPS maintenance |
| Activity timeline | Single insert per event — O(1) |
| Workspace search | LIKE queries on 3 tables with user scoping — fast for typical data volumes |
| Dependency graph | BFS traversal is depth-bounded; `ANY(int[])` SQL is indexed |

---

## 15. Architectural Trade-offs

**Trade-off 1: Per-user scoping vs. cross-user scoping**  
All UWPS queries are scoped by `user_id`. Future multi-user collaboration on a business workspace would require a `workspace_members` table and query rewriting. The architecture supports this addition without breaking the current contract.

**Trade-off 2: Computed health vs. stored health**  
Health is stored as an append-only snapshot each time it's computed. This means the latest health score requires a `DISTINCT ON (project_id)` query sorted by `computed_at DESC`. The `project_registry.health_score` column provides O(1) access to the latest score without this query.

**Trade-off 3: Soft FK to existing businesses table**  
`business_workspaces.business_id` is an INTEGER with no DB-level FK constraint. This avoids any risk of breaking existing business data during this additive build. A future hardening build can add the constraint once the existing data is verified.

**Trade-off 4: 6 health dimensions vs. more granular scoring**  
The 6-dimension model (completeness, activity, dependency, deployment, documentation, automation) covers the spec's stated requirements. Additional dimensions (collaboration, security, performance, cost) are straightforward to add by extending the `project_health` table and updating the scoring function — the EP at `uwps.project_health` is the extension seam.

---

## 16. Extension Points Added

8 new extension points declared at boot:

| EP ID | Description |
|-------|-------------|
| `uwps.business_organization` | Owns every business, workspace, and organizational hierarchy |
| `uwps.project_lifecycle` | Project creation, archival, templates, cloning, migration |
| `uwps.asset_registry` | Registers every platform asset |
| `uwps.asset_relationships` | Maps dependencies between assets — ASH traversal seam |
| `uwps.workspace_activity` | Append-only workspace activity timeline |
| `uwps.project_health` | 6-dimension project health scoring |
| `uwps.search` | Cross-object search across businesses, projects, assets |
| `uwps.advisory` | EB context note advisory for ASH workspace awareness |

**Cumulative extension points: 350** (342 before + 8 UWPS)

---

## 17. Unified Workspace Score

| Criterion | Status | Notes |
|-----------|--------|-------|
| Business hierarchy | ✅ | business_workspaces + business_projects + existing businesses table |
| Project hierarchy | ✅ | Phase-based lifecycle (planning → building → testing → launched) |
| Asset registry | ✅ | 20 asset types, version tracking, deployment status |
| Asset relationships | ✅ | 8 relationship types, 3 strengths, impact analysis |
| Project health | ✅ | 6-dimension composite score, warnings, recommendations |
| Activity timeline | ✅ | 13 activity types, 3 actors, append-only |
| Executive Brain integration | ✅ | Pre-warm + trigger + advisory in EB context note every cycle |
| ASH project awareness | ✅ | ASH can answer all 5 spec questions from advisory + endpoints |
| Backward compatibility | ✅ | Purely additive — Builds 001–046 untouched |
| TypeCheck | ✅ | 0 errors |
| extensionPoints | ✅ | 350 confirmed at boot |
| Unified Workspace Law | ✅ | Enacted in executive_policies |
| 5 built-in templates | ✅ | Website, CRM, Automation, SaaS, Dashboard |

**Unified Workspace Score: 13/13** — All success criteria met.

---

## Chief Architect Note

Build 047 completes the organizational foundation of the platform. With UWPS in place, every future builder, application, and AI agent has a shared model for creating and reasoning about work:

- **Builders** create assets within projects (not standalone files)
- **ASH** reasons about projects (not individual endpoints)
- **The platform** maintains full lineage, health, and dependency information for every object ever created

The combination of UPOS (Build 046) + UWPS (Build 047) means the platform now has both a runtime operating layer (UPOS) and an organizational persistence layer (UWPS). They are complementary: UPOS handles where you are right now; UWPS handles everything you've ever built.

---

*Build 047 — Unified Workspace & Project System*  
*Completed: 2026-08-02*  
*Engineer: Replit Agent (ASH Cognitive Operating System)*

---

**STOP. Waiting for Build 048.**
