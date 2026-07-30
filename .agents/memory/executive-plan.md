---
name: Executive Planning Engine
description: Build 009 — deterministic planning engine that transforms Goals into structured execution plans with milestones, steps, dependency analysis, scoring, and immutable history. Planning NEVER executes.
---

## Rule
Planning is pure strategy — no execution, no AI calls, no goal/judgment mutations. Every future Execution, Reflection, and Learning system depends on this schema and services.

**Why:** Plans bridge Goal (what we want) and Execution (what we do). The strict planning-only contract preserves determinism and lets the future Execution Engine be reusable across every Brain.

## How to apply
- Always use `plan-services` exports — never write direct DB queries for plans.
- **One-way dependency**: executive-brain → executive-plan. Plans are derived from Goals. Never import executive-brain from executive-plan.
- Plan generation is deterministic: `generatePlanForStrategy(input, strategy)` — no AI calls, no I/O, pure computation.
- Scoring weights: complexity×0.15 + risk×0.25 + cost×0.10 + duration×0.15 + resource_demand×0.10 + strategic_alignment×0.15 + confidence×0.10. complexity, risk, cost, duration, resource_demand are ALL INVERTED (lower input = better score).
- Plan history (`plan_history`) is immutable append-only. Never delete or update rows.

## DB Tables (6 new)
- `executive_plans` — main plan model, self-referencing `parent_plan_id` for hierarchy + alternatives
- `plan_milestones` — hierarchical milestones (`parent_milestone_id`), ordered by `order_index`
- `plan_steps` — ordered work steps within a milestone, per-plan index for full plan step retrieval
- `plan_dependencies` — directed graph across plans/milestones/steps; `source_type` discriminates
- `plan_history` — immutable revision/decision/alternative/rejection/approval event log
- `plan_metrics` — flexible KV metrics per plan

## Executive Brain integration flow (as of Build 009)
Context (B006) → Goals (B008) → Judgment (B007+B008) → Fetch active plans + ensure plan for primary goal (B009) → Context note with planning advisory

`ensurePlanForPrimaryGoal` skips generation if a plan already covers the primary goal → idempotent.

## Strategy blueprints (deterministic)
- top_down: Discovery → criteria-derived milestones → Review (default)
- bottom_up: Capability Assessment → Foundation → Integration → Goal Alignment
- iterative: N discovery/build/validate cycles (based on criteria count)
- agile: Sprint 0 Setup + N delivery sprints
- waterfall: Requirements → Design → Implementation → Testing → Delivery

## Dependency detectors (5, pure in-process, no I/O)
1. Circular dependencies — DFS cycle detection
2. Missing prerequisites — dependency targets not in plan
3. Resource conflicts — unordered steps sharing same assigned brain
4. Invalid ordering — step depends on item with equal/later orderIndex
5. Blocked milestones — active milestone with incomplete dependencies

## Extension points total after Build 009
44 (38 prior + 6 new: plan-generated, plan-status-changed, plan-scored, plan-dependency-detected, plan-milestone-completed, plan-archived)
