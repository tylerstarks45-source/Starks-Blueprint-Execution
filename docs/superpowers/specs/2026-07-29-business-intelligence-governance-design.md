# Business Intelligence Ownership & Audit Governance — Phase A Design

## Status

Implemented and verified. This is Phase A of a two-phase governance
initiative: it establishes the reference ownership/audit/access-layer
pattern scoped strictly to the Business Intelligence Engine (Phase 1.5A).
Phase B — extending this same pattern to the rest of the platform (files,
landing pages, websites, funnels, automations, analytics, connectors) — is
explicitly out of scope here and requires separate authorization.

## Goal & why

Phase 1.5A made the Business Intelligence Engine functionally complete and
100% spec-compliant, but every BI table only tracked a `businessId` — there
was no explicit, denormalized record of who owns each row, no single
enforcement point for "can this caller touch this data," and no
change-history ledger independent of the Business Timeline (which narrates
business events for a human/AI audience, not "what changed and who changed
it" for compliance purposes). This phase closes that gap without touching
BI's actual intelligence logic (DNA truth resolution, state/capability
derivation, conflict/review policy) — governance is additive
instrumentation on top of an unchanged design.

## Scope

**In scope (Phase A):** the 11 tables already covered by the Business
Intelligence Engine — DNA claims, DNA versions, DNA conflicts, review queue,
business memory, business-scoped knowledge entries (`ash_knowledge_entries`),
recommendations, health metrics, health scores, domain events, timeline
events — plus the new `audit_trail_entries` table.

**Explicitly out of scope (deferred to Phase B):** every other subsystem
(files, landing pages, websites, funnels, automations, analytics,
connectors, credentials, system instances). Building actual multi-user
workspaces, teams, or role-based permission enforcement — Phase A only adds
the extension point (see below). Changing what the Business Timeline is for.
A new external audit/SIEM integration.

## Architecture

```text
                     ┌─────────────────────────────┐
                     │   Authenticated HTTP route    │
                     │ (business-intelligence.ts,    │
                     │  business-health.ts,           │
                     │  business-recommendations.ts)  │
                     └───────────────┬─────────────┘
                                     │ caller.id known
                                     ▼
                     ┌─────────────────────────────┐
                     │   BI engines (unchanged)      │
                     │ dna.ts · events.ts · memory-   │
                     │ engine/* · health-monitor.ts · │
                     │ knowledge-writer.ts · worker.ts│
                     └───────────────┬─────────────┘
                                     │ businessId / userId in scope
                                     ▼
        ┌───────────────────────────────────────────────────┐
        │        Data Access Layer — lib/governance/          │
        │                                                       │
        │  ownership.ts   → findOwnedBusiness (authz check)     │
        │                   resolveBusinessOwnerUserId (lookup) │
        │  writes/*.ts    → one governed wrapper per table:     │
        │                   insertX / updateX, per governed     │
        │                   table (dna, events, memory,         │
        │                   knowledge, recommendations, health) │
        │  audit.ts       → recordAudit (paired, same tx)        │
        └───────────────┬───────────────────────┬─────────────┘
                         │                       │
                         ▼                       ▼
        ┌────────────────────────┐   ┌───────────────────────┐
        │  11 governed BI tables  │   │  audit_trail_entries    │
        │  (ownerUserId NOT NULL) │   │  (append-only ledger)  │
        └────────────────────────┘   └───────────────────────┘
```

No BI route or engine calls `db.insert()` / `db.update()` on a governed
table directly anymore — every write goes through exactly one function in
`lib/governance/writes/*`. This was verified by grepping the entire
api-server source tree for raw insert/update calls against all 11 governed
table identifiers outside `lib/governance/` and `__tests__/`: zero matches.
Reads are unaffected — routes and engines still `db.select()` directly
(governance controls writes and cross-cutting authorization, not every
query shape), scoped through the same `findOwnedBusiness` authorization
check that used to be copy-pasted five times across
`business-intelligence.ts`, `business-health.ts`,
`business-recommendations.ts`, `logs.ts`, and `monitoring.ts`.

## Ownership metadata contract

Every governed table carries the same seven columns
(`ownershipColumns()` in `lib/db/src/schema/governance.ts`):

| Column | Type | Meaning |
|---|---|---|
| `ownerUserId` | `integer NOT NULL` | Denormalized owner of the record — almost always the owning business's `ownerId`; for user-scoped `ash_knowledge_entries` it equals that row's own `userId` directly. One indexed column, no join, to answer "does this row belong to this user." |
| `teamWorkspaceId` | `integer`, nullable | Reserved Phase B extension point — see below. Always `null` today; no query reads or filters on it yet. |
| `sourceEngine` | `text NOT NULL` | Dot-namespaced origin, e.g. `business_intelligence.dna`, `business_intelligence.health_analysis`. Lets audit/debugging filter by sub-engine without an enum migration every time a new engine is added. |
| `createdByUserId` / `updatedByUserId` | `integer`, nullable | Who performed the create/last update. `null` means a system/AI/scheduler action, not a human — mirrors `audit_trail_entries.actorUserId` nullability. |
| `governanceStatus` | `text NOT NULL`, default `active` | Generic active/archived/deleted lifecycle flag owned by the Data Access Layer. Deliberately distinct from each table's own domain `status` column (e.g. conflict open/resolved/deferred) — those keep their existing meaning untouched. |
| `recordVersion` | `integer NOT NULL`, default `1` | Generic optimistic-concurrency counter, incremented on every governed update. Distinct from `business_dna_claims.version`, which tracks how many times a DNA *value* has changed — a pre-existing domain concept this layer never touches. |

**Relationship to `businesses.ownerId` and `client_workspaces` (explicit
ruling, carried over unchanged from the approved plan):** `ownerUserId` is a
denormalization of `businesses.ownerId`, not a replacement for it —
`businesses.ownerId` remains the source of truth; governance just copies it
onto every dependent row so ownership can be checked without a join.
`teamWorkspaceId` is a placeholder for a **future, generic, internal**
Team Workspace concept (teams/orgs/departments/RBAC) and must never be
conflated with the existing `client_workspaces` table, which is an
unrelated, customer-facing, agency/white-label concept. No FK is declared
on `teamWorkspaceId` because the Team Workspace table doesn't exist yet.

## Ownership flow

```text
Who is the actor?              How ownerUserId is resolved
──────────────────             ──────────────────────────────────────
"user" via HTTP route     →    caller already has business/currentUser
                                 in scope from route-level auth; ctx is
                                 built inline: { ownerUserId: business
                                 .ownerId, actor: actorFor("user",
                                 currentUser.id) }

"system" (health monitor,  →   business already loaded earlier in the
 DNA import/reconcile,          same function; ctx built inline from
 event publish)                 business.ownerId; actor: actorFor("system")

"ai" (DNA inference,       →   same as "system" but actor: actorFor("ai")
 recommendation generation,     — the row's VALUE came from a model, not
 knowledge-entry write)         a deterministic derivation

"scheduler" (memory/        →  private per-file helper resolves owner via
 knowledge maintenance          resolveBusinessOwnerUserId(tx, businessId)
 sweeps)                        since these callers only have a bare id,
                                 not an already-loaded business row

ash_knowledge_entries      →   special case — ownerUserId = the row's own
 (user-scoped, optional         userId directly (no business join,
 business association)          because the table isn't required to have
                                 a businessId at all)
```

Public function signatures were kept unchanged everywhere the acting party
is already deterministic from existing parameters (`businessId`, `userId`)
— the write wrapper resolves `ctx` internally. Only DNA's private,
module-internal `*Tx` helpers thread `ctx` explicitly, since those never
cross the module boundary. This kept the blast radius of the whole
migration limited to implementation bodies, not call sites, across
`dna.ts`, `events.ts`, `health-monitor.ts`, `runtime/worker.ts`,
`memory-engine/business-memory.ts`, `memory-engine/knowledge-memory.ts`,
`memory-engine/maintenance.ts`, and `research-engine/knowledge-writer.ts`.

## Data flow — before vs. after

```text
BEFORE (Phase 1.5A):
  route/engine ──db.insert(table).values({...domain fields...})──▶ table

AFTER (Phase A):
  route/engine ──insertX({...domain fields...}, ctx)──▶ writes/x-writes.ts
                                                              │
                                     db.transaction(tx => {   │
                                       tx.insert(table)       │
                                         .values({            │
                                           ...domain fields,  │
                                           ...stampCreate(ctx)│ ← ownership
                                         })                   │   + audit
                                         .returning();        │   columns
                                       recordAudit(tx, ctx, { │   stamped
                                         recordTable, recordId,│  automatically
                                         action: "create",     │
                                       });                     │
                                     })                        ▼
                                                        table + audit_trail_entries
                                                        (same transaction — an
                                                         audit row can never exist
                                                         without its write having
                                                         committed, or vice versa)
```

Update wrappers follow the same shape but additionally: (1) require a
pre-update `before` row (fetched by the wrapper or passed in by a caller
that already has one), (2) compute a shallow before/after diff via
`diffChanges()` over only the keys present in the patch — so an audit row
never claims a field changed that the caller didn't touch, (3) apply
`stampUpdate(ctx)` which sets `updatedByUserId` and increments
`recordVersion` via `sql\`record_version + 1\``.

Two atomicity-preservation decisions were made while migrating existing
single-statement atomic operations into this two-step (mutate + audit)
shape:
- The review-queue resolve endpoint originally relied on one atomic
  `UPDATE ... WHERE status = 'open'` to guarantee "can't resolve the same
  item twice." Its governed replacement wraps `SELECT ... FOR UPDATE` +
  `updateReviewQueueItem` in one `db.transaction()` to preserve that
  guarantee under concurrent requests.
- The DNA conflict decision endpoint and the recommendation dismiss/apply
  endpoints had no equivalent status guard in the original code, so a plain
  SELECT-then-governed-update is behavior-equivalent — no transaction
  wrapper was needed there.
- `worker.ts`'s bulk "mark stale" update (many recommendation rows in one
  statement) was converted to a per-row loop through `updateRecommendation`
  so each row gets an accurate, individual before/after audit entry. This
  trades one bulk query for N queries — judged correct given the small,
  bounded N (stale-marking runs against one business's recommendation set
  at a time, not the whole table); see Performance Impact below.

## Audit flow

`audit_trail_entries` is a platform-generic, append-only ledger keyed by
`(recordTable, recordId)` — deliberately not nested under Business
Intelligence specifically, so Phase B subsystems can write to this **same**
table later without a schema change or rename. It answers "who or what
changed this row, when, and exactly what changed" for compliance/security
traceability — a distinct job from the Business Timeline, which narrates
business events ("a conflict was found," "health was recomputed") for a
human/AI audience and keeps that job unchanged.

**Scope is mutations only.** Reads are never logged (this is a data-change
ledger, not an access log — logging every read would flood the table with
no compliance value). **Bookkeeping-only writes are exempt by design** —
touching nothing but a cache/freshness column, such as a
`lastAccessedAt` bump on memory/knowledge access, or a domain event's
`processed` status flip, does not produce an audit row. This exemption is
implemented as separate, explicitly-named functions
(`touchBusinessMemoryAccess`, `touchKnowledgeEntryAccess`,
`markDomainEventProcessed`) rather than a flag on the general update path,
so the exemption is visible at the call site instead of hidden inside a
conditional.

Every audit row records: `ownerUserId` (owner of the record, denormalized
so audit queries never need to join back through the record table),
`businessId` (denormalized for the same reason), `recordTable` + `recordId`
(what changed), `action` (`create` / `update` / `delete`), `sourceEngine`
(which BI sub-engine performed it), `actorType` (`user` / `system` / `ai` /
`scheduler`) + `actorUserId` (nullable — null for non-human actions),
`changes` (JSONB before/after diff for updates, full snapshot for creates),
and `occurredAt`.

## Access layer overview

`artifacts/api-server/src/lib/governance/`:

- **`types.ts`** — `GovernedActor` (`actorType` + optional `actorUserId`),
  `GovernedWriteContext` (`ownerUserId`, `sourceEngine`, `actor`, optional
  `businessId`), and the `actorFor(type, userId?)` builder helper.
- **`ownership.ts`** — two distinct functions with distinct jobs, kept
  separate on purpose: `findOwnedBusiness(businessId, ownerId)` is an
  **authorization check** used by routes (returns the business only if the
  caller owns it — replaces five previously copy-pasted implementations);
  `resolveBusinessOwnerUserId(tx, businessId)` is a **plain lookup** used
  inside governed writes when only a trusted `businessId` is in scope (e.g.
  a scheduler sweep) — it throws if the business doesn't exist, because
  that indicates a bug upstream, not a normal not-found case to swallow.
- **`audit.ts`** — `recordAudit(tx, ctx, input)`, the single place that
  writes to `audit_trail_entries`. Always called from inside the same
  transaction as the mutation it's recording.
- **`writes/helpers.ts`** — `stampCreate(ctx)` / `stampUpdate(ctx)` produce
  the governance columns to merge into an insert/update payload;
  `diffChanges(before, patch)` computes the shallow, JSON-content-compared
  before/after diff; `GovernanceManagedKeys` is the type-level list of
  columns a call site can never supply directly (id, timestamps, and every
  ownership/audit column), so a caller cannot accidentally override
  ownership metadata.
- **`writes/{dna,events,memory,knowledge,recommendations,health}-writes.ts`**
  — one file per BI sub-engine, each exporting the specific
  insert/update/touch functions that engine needs (e.g.
  `insertDomainEvent`, `insertTimelineEvent`, `markDomainEventProcessed` in
  `events-writes.ts`; `insertHealthMetric`, `insertHealthScore` in
  `health-writes.ts`).
- **`index.ts`** — barrel export. The only sanctioned import path for BI
  write access; Phase B subsystems are expected to add their own
  `writes/*-writes.ts` files here rather than reinvent the layer.

## Extension points for Phase B

1. **`teamWorkspaceId`** is already a column on every governed table today,
   sitting unused (`null`) and unindexed-for-filtering. When a real Team
   Workspace subsystem is designed, ownership checks become "owner user OR
   member of owner's team workspace" — a single change inside
   `findOwnedBusiness`/`resolveBusinessOwnerUserId` (and their Phase B
   counterparts for other subsystems), not a schema migration or a rewrite
   of every call site, since call sites never touch ownership columns
   directly.
2. **`GovernedActor`/`GovernedWriteContext`** already model "who/what is
   acting," including a `scheduler` actor type distinct from `system` —
   the foundation an RBAC layer needs to answer "is this actor allowed to
   perform this action," not just "does this actor own this data." Adding
   a permission check is a matter of inserting a check before
   `stampCreate`/`stampUpdate` is applied, without changing the audit shape.
3. **`audit_trail_entries`** is schema-generic (`recordTable` is a free
   string, not an enum or FK) specifically so Phase B subsystems (files,
   landing pages, automations, etc.) can write to it immediately once they
   adopt their own governed-write wrappers, with no migration.
4. **The `lib/governance/` module structure itself** (ownership check +
   per-table write wrappers + shared audit call) is the pattern Phase B is
   expected to copy per subsystem — e.g. `lib/governance/writes/files-writes.ts`
   — rather than each subsystem inventing its own shape.
5. **Explicitly NOT an extension point yet:** system instances
   (`findOwnedSystemInstance` in `logs.ts`/`monitoring.ts`) were
   deliberately left as a separate, ungoverned authorization check — they
   are a different resource type from BI's `businessId`-scoped data, and
   folding them into this layer is a Phase B decision, not an accidental
   gap in Phase A.

## Remaining technical debt

- **`ashResearchProfilesTable` is intentionally ungoverned.** It's a
  satellite/derived projection of an already-governed knowledge entry —
  deleted and rewritten wholesale rather than independently mutated — so it
  was ruled out of the approved Phase A table list. Left untouched, with an
  inline comment at its write site explaining the exclusion. A Phase B
  candidate if it ever becomes independently mutable.
- **System instances remain a separate, ungoverned resource.**
  `findOwnedSystemInstance` in `logs.ts` and `monitoring.ts` was kept as-is
  (not merged into `findOwnedBusiness`) because system instances are a
  different resource type from BI's business-scoped data. Both files keep
  an explanatory comment at the point of divergence.
- **`teamWorkspaceId` is inert.** It exists on every governed table and in
  the schema doc comments, but no query filters on it and no write ever
  sets it to a non-null value — by design, until Phase B defines the Team
  Workspace subsystem itself.
- **The stale-recommendation bulk update became a per-row loop** to get
  accurate per-record audit diffs (see Data Flow above). This is the right
  tradeoff at current scale (bounded by one business's recommendation
  count) but would need revisiting — e.g. a bulk update paired with one
  audit row per affected id fetched via `RETURNING`, rather than N
  round-trips — if a future workload made stale-marking span very large
  recommendation sets.
- **Test fixtures were given `ownerUserId` directly, not through the
  governance wrappers.** `__tests__/*` setup code (seeding a business,
  seeding a stale knowledge entry, etc.) intentionally stays on raw
  `db.insert()` — test scaffolding is not a production write path — but it
  now has to pass `ownerUserId` explicitly wherever a governed table's
  fixture data is inserted, so `ownerUserId NOT NULL` doesn't silently
  drift from what the type checker enforces in production code.

## Performance impact

- **Extra write per governed mutation:** each governed create/update now
  performs one additional `INSERT` into `audit_trail_entries` inside the
  same transaction as the original write — roughly doubling the write
  count for BI mutations (reads are completely unaffected; there is no
  additional query on any BI read path). This is proportional to existing
  BI write volume, which is low-frequency, per-business, human/AI-paced
  activity (DNA claims, recommendations, health snapshots) — not a
  high-throughput hot path.
- **New indexes** on `audit_trail_entries` (`ownerUserId`, `businessId`,
  `(recordTable, recordId)`, `occurredAt`) keep the two expected access
  patterns — "show me this business's audit history" and "show me this
  record's change history" — index-backed from day one.
- **The stale-recommendation per-row loop** (see Technical Debt) trades a
  single bulk `UPDATE` for N sequential `updateRecommendation` calls when
  marking recommendations stale. At current scale (bounded per-business
  recommendation counts, an infrequent maintenance pass rather than a
  request-path operation) this is not measurable; flagged above as the one
  place to revisit first if that assumption changes.
- **No N+1 introduced on any read path** — `findOwnedBusiness` is the same
  single indexed lookup it always was (now called from one shared
  implementation instead of five duplicated ones), and no governed read
  query changed shape.
- **Backfill was a one-time cost**, not a recurring one: a single
  transactional SQL script backfilled `ownerUserId` on every pre-existing
  row (711 rows total across the 11 tables in the current dataset) via
  `businessId -> businesses.ownerId` joins (or `ash_knowledge_entries`'
  own `userId`), verified against zero remaining `NULL`s and zero orphaned
  `businessId`/`userId` references before the columns were altered to
  `NOT NULL`.
