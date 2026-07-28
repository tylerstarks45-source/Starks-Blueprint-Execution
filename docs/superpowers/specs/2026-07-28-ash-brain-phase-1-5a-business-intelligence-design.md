# ASH Brain v2.0 — Phase 1.5A: Business Intelligence Engine

## Status

Approved architecture, expanded with the Business Timeline, Business Capabilities Registry, event-driven integration, hybrid DNA initialization, Business Truth Resolution Policy, and Intelligent Conflict Escalation Policy.

## Goal

Create a modular, business-scoped intelligence layer that becomes ASH's authoritative source for business identity, current state, health, capability, recommendations, strategy context, and decision support. It must extend—not replace—the existing business, health, recommendations, memory, planning, Executive Brain, AI Orchestrator, and runtime systems.

## Scope and compatibility

The engine will reuse the existing `businesses` root entity, current live health metrics, job-based health analyses, recommendations, business memory, projects, goals, tasks, connections, and runtime jobs.

Existing routes, database records, health calculations, recommendation generation, and business-building flows remain backwards compatible. The Business Intelligence Engine is an additive service layer and event subscriber. It does not duplicate existing operational data in a second business profile.

Phase 1.5A prepares clean extension points only for the Business Digital Twin, Opportunity Radar, Founder Intelligence, Parallel Strategy Engine, Business Evolution Engine, and Autonomous Company Operating System. It does not implement them.

## Architecture

```text
Business events and existing data
   │
   ├── Business DNA Registry ── Truth Resolution ── Conflicts / Reviews
   ├── Business State Engine ── Health / goals / projects / tasks / services
   ├── Business Capabilities Registry
   └── Business Timeline
                 │
                 ▼
       Business Context Assembler
                 │
Executive Brain → Business Intelligence Engine → Planning Engine
                 → Memory Engine → AI Orchestrator → Existing Runtime
```

### Module boundaries

1. **Business DNA Registry** owns versioned claims about durable business identity, strategy, brand, constraints, tool preferences, and success metrics.
2. **Truth Resolution Service** evaluates incoming claims and selects the current value without losing evidence or history.
3. **Business State Engine** derives current operating condition from existing data rather than persisting a duplicate operational model.
4. **Business Capabilities Registry** derives the capabilities currently available to a business from systems, connections, assets, and configuration.
5. **Business Timeline** records significant domain events as a chronological historical record.
6. **Conflict and Review Service** classifies conflicts, drives immediate escalation where required, and queues low-impact review recommendations.
7. **Business Context Assembler** produces a concise, relevance-filtered package for Executive Brain decisions.
8. **Business Event Bus** provides a provider-independent, database-independent publishing/subscription boundary. Existing engines publish events; the BI Engine and future engines subscribe instead of directly changing one another's state.

## Business DNA

Business DNA is a permanent, living, field-level knowledge base, not a one-time setup form. The initial field catalogue is configuration-driven and includes identity, mission, vision, values, industry, business/revenue model, products, services, audience/customer, brand attributes, strategies, technology/AI stack, integrations, constraints, rules, risks, goals, and success metrics.

Business types and field definitions are configuration-driven. New types, lifecycle stages, and DNA fields must not require core engine logic changes.

### DNA claim record

Each field maintains:

- Current value
- Current confidence score
- Current trust level
- Source and reasoning
- Last-updated timestamp and version number
- Previous values and immutable change history
- Supporting or conflicting evidence
- Resolution state for conflicts

Trust levels, from strongest to weakest:

1. `user_confirmed`
2. `verified_system_data`
3. `high_confidence_inference`
4. `low_confidence_inference`

### Hybrid initialization and evolution

The initializer/reconciler always proceeds in this order:

1. **Import existing data:** inspect business records, projects, goals, tasks, memory, connections, APIs, websites, landing pages, files, analytics, and existing configuration. Never ask for existing information.
2. **Intelligent inference:** infer missing values from available, business-owned evidence. Every inferred value persists confidence, source, reasoning, and inferred status; it remains editable.
3. **Guided confirmation:** ask only one prioritized, context-aware question when a high-impact missing value materially improves a current decision. There is no mandatory setup wizard.
4. **Continuous evolution:** reconcile newly available evidence, raise confidence, retain history, and record why a value changed. DNA is never considered complete.

### Business Truth Resolution Policy

| Existing current claim | Incoming evidence | Resolution |
|---|---|---|
| User-confirmed | Any conflicting claim | Preserve current claim. Persist incoming evidence, create a conflict, inform Executive Brain, and recommend review. Never auto-overwrite. |
| Verified system data | New verified, demonstrably newer claim | Promote incoming claim; retain full history. |
| Verified system data | Inferred or unverified conflicting claim | Preserve verified current claim; retain incoming evidence as support/conflict. |
| Inferred claim | Higher-confidence claim | Promote automatically and preserve history. |
| Any claim | Equivalent value with stronger evidence | Retain value, strengthen confidence/evidence trail, and record a version event. |

The Executive Brain always receives the highest-trust resolved value plus a compact unresolved-conflict indicator.

## Business State Engine

The state engine derives an up-to-date snapshot rather than copying existing operational records. Its configurable lifecycle catalogue initially includes idea, validation, planning, building, branding, website development, landing pages, marketing, launch, optimization, growth, scaling, automation, maintenance, expansion, maturity, and exit.

It assembles only business-owned signals:

- Current lifecycle phase, objective, milestone, sprint, and launch status
- Revenue context where available
- Active projects, goals, tasks, campaigns, systems, integrations, and automations
- Website, funnel, SEO, and health status
- Open problems, opportunities, priorities, and risks

It consumes existing live `business_health_metrics` operational signals and AI `business_health_scores` narrative analysis without merging their responsibilities. The state package explains their freshness and source.

## Capabilities Registry

The capabilities registry answers: **“What can this business currently do?”**

Capabilities are derived from verified systems, connections, published assets, and configuration rather than manually duplicated. Initial configurable capabilities cover website, landing pages, funnel, blog, SEO, email marketing, CRM, automations, analytics, AI agents, payment processing, memberships, affiliate program, products, and services.

Each capability reports availability, evidence, confidence/trust, related objects, and detected gaps. Executive Brain and recommendations use it to identify improvements without assuming all businesses need the same capability.

## Timeline

The timeline is an append-only chronological record, scoped to one business. Each event includes timestamp, type, related business/project, source, description, trigger, and related-object references.

Initial event types include business creation; DNA/goal/project changes; website, landing page, funnel, automation, API, and integration events; revenue milestones; major recommendations; reviews; high-impact conflicts; user decisions; and Executive Brain decisions. Events must be published through the shared event boundary where possible, not written ad hoc by unrelated subsystems.

## Events and subscribers

Use a typed internal event contract with durable event records/outbox semantics suitable for the current database/runtime, without requiring a new message broker.

Example event flow:

```text
project.completed
  → State refresh
  → Existing health recalculation trigger
  → Existing recommendation recalculation trigger
  → Timeline event
  → Context cache/summary refresh
  → Executive Brain notification
```

```text
integration.connected
  → Capabilities refresh
  → DNA evidence reconciliation
  → Context refresh
  → Opportunity/recommendation recalculation
  → Timeline event
```

Handlers must be idempotent and fail independently. Existing polling/scheduled health work remains as a reconciliation fallback, not the primary source for event-responsive updates.

## Intelligent Conflict Escalation and Business Review Queue

The Executive Brain applies configurable urgency/impact rules and thresholds to each unresolved DNA conflict.

### Immediate escalation

Immediately surface a conflict only when it can materially affect current execution, business decisions, revenue, security, APIs, credentials, billing, compliance, launch readiness, or active projects. The prompt must show:

- Current and newly discovered values
- Both trust levels
- Why it matters now
- Recommended action
- Actions: keep current, accept new, edit, or defer

### Non-interrupting review

All lower-impact conflicts enter a per-business Business Review Queue. The review presents recommendations—not interruptions—including inferred information, confidence improvements, suggested corrections, stale fields, unresolved conflicts, and recommended DNA updates.

User decisions and deferrals are timeline events and become future evidence; they never cross business boundaries.

## Context Package and integration order

For business-related execution, Executive Brain resolves the active business and requests a relevance-filtered Business Context Package before Planning and Memory enrichment:

1. Executive Brain resolves user, business, project, and goal.
2. Business Intelligence Engine assembles DNA, state, capabilities, applicable health, relevant analytics, and critical conflicts.
3. Planning Engine receives the business context and current planning state.
4. Research/Knowledge and Memory Engine add only business-scoped relevant knowledge and memory.
5. The existing AI Orchestrator and tool runtime receive the enriched internal context.

The package is concise, uses highest-trust values, identifies freshness, and omits unrelated fields.

## Multi-business isolation

Every BI query, claim, event, conflict, review, capability, context package, and timeline record is scoped by the owning business and authenticated user. Existing user ownership checks remain mandatory. Cross-business association is impossible unless an explicit user-created relationship is later modeled and passed as a deliberate scope.

No context retrieval may silently use a user-wide memory, knowledge, file, analytics, website, or task result for a different business.

## Data model

Additive persistence will use separate, focused tables for:

- DNA claims and immutable claim versions/evidence
- DNA conflicts and resolution/defer decisions
- Business timeline events
- Business review queue items
- Optional durable domain events/outbox

State and capabilities remain derived reads backed by existing business data and caches only when a measurable performance need is demonstrated. Existing business, health, recommendation, project, goal, task, memory, and connection tables are not replaced.

## Error handling and performance

- Context assembly is fail-open: unavailable optional BI components add a concise availability/freshness note but do not block existing orchestration.
- Truth updates and event handlers are idempotent and transactional per record.
- A failed subscriber must not prevent timeline recording or unrelated subscribers.
- Context assembly uses targeted, business-scoped queries and field selection; no unbounded historical reads are injected into prompts.
- Scheduled reconciliation catches missed events and stale state.

## Tests

Automated tests will cover:

1. Import-first DNA initialization and no redundant confirmation prompt.
2. Inference metadata, evidence, and confidence upgrades.
3. All truth-resolution cases and immutable history.
4. Immediate high-impact escalation vs. low-impact Business Review Queue routing.
5. User action handling: keep, accept, edit, defer.
6. Timeline creation and idempotent event handling.
7. Capability derivation and gap detection.
8. Strict multi-business isolation.
9. Business Context Package relevance, conflict indicators, and Executive Brain integration.
10. Backward-compatible health and recommendation flows.

## Implementation sequencing

1. Establish domain types/configuration, schemas, repositories, and event contract.
2. Implement DNA import/reconcile/truth-resolution services plus timeline/conflicts/reviews.
3. Implement state, capability, and context assemblers using current systems.
4. Wire event publishers/subscribers and Executive Brain enrichment.
5. Add targeted APIs and UI only where existing surfaces need the new data/actions.
6. Run schema push, typechecks, tests, workflow restart, and end-to-end verification.

## Remaining technical debt / Phase 1.5B recommendations

- The initial event implementation uses the current database/runtime; a future scale threshold may justify an external broker without changing publishers/subscribers.
- Analytics and revenue context are only as complete as current integrations; their availability/freshness must be explicit in BI context.
- Cross-business linking requires a future explicit relationship model and must not be inferred.
- Phase 1.5B should prioritize the first consumer of this foundation (such as Opportunity Radar) only after measured BI context and event quality are validated.