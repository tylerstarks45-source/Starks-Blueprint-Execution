---
name: Executive Goal Engine
description: Build 008 — first-class goal objects with hierarchy, priority scoring, conflict detection, and progress tracking. Goals influence Judgment; Judgment never changes Goals.
---

## Rule
Goals are first-class cognitive objects. Every future Planning, Execution, Reflection and Learning system depends on the `executive_goals` schema and services introduced here.

**Why:** Goals give ASH purpose — the permanent system responsible for defining, organizing, prioritizing, tracking, and managing every objective.

## How to apply
- Always use `createGoal`, `updateGoal`, `listActiveGoals`, etc. from `lib/executive-goal/` — never write direct DB queries for goals.
- **One-way dependency**: executive-brain → executive-goal. Goals influence Judgment. Judgment never changes Goals. Never import executive-brain from executive-goal.
- Priority score formula: importance×0.30 + urgency×0.25 + strategicValue×0.20 + opportunity×0.10 + (100-risk)×0.10 + confidence×0.05. Risk is inverted.
- `urgency` is supplemented by target-date proximity when not explicitly provided.

## DB Tables (4 new)
- `executive_goals` — main model with self-referencing `parent_goal_id` for unlimited nesting
- `goal_dependencies` — directed graph (blocks/enables/requires/related); used by conflict engine
- `goal_progress_history` — immutable append-only snapshots; never deleted
- `goal_metrics` — flexible KV metric readings per goal

## Conflict detection (never resolves — only reports)
1. Circular dependencies — DFS on goal_dependencies graph
2. Resource conflicts — 2+ active goals with same owner_brain and priority_score ≥ 70
3. Deadline conflicts — sibling goals with target dates ≤ 7 days apart and urgency > 60
4. Contradictory objectives — same-category active goals with contrary keyword pairs

## Executive Brain integration flow (as of Build 008)
Context (B006) → Fetch active goals (B008) → Judgment with goal-enriched options (B007+B008) → Context note with goal advisory

Goal enrichment applied in `goal-integration.ts::enrichOptionsWithGoals`:
- execute_primary_plan: +5 strategicValue per high-priority active goal (capped at +20)
- defer_for_clarification: −20 urgency and −15 strategicValue when critical goals (≥85) exist
- simplify_approach: +10 strategicValue when 2+ complex goals (strategicValue ≥ 70)

## Extension points total after Build 008
38 (32 prior + 6 new: goal-created, goal-status-changed, goal-priority-computed, goal-conflict-detected, goal-progress-updated, goal-hierarchy-changed)
