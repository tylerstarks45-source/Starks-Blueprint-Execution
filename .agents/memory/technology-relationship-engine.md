---
name: Technology Relationship Intelligence Engine
description: Build 034 — relationship graph over the 54-technology catalog; 9 tables, 8 EPs, 246 total EPs; non-obvious TS and naming gotchas.
---

## Rule
TypeScript tuple optional element with a union type requires parentheses: `("directed" | "bidirectional")?` not `"directed" | "bidirectional"?` (error TS17019).

**Why:** Without parens, the parser reads it as `"directed" | ("bidirectional"?)` which is invalid TS.

**How to apply:** Any time an optional tuple element is a union type, wrap the union in parens before the `?`.

## Rule
`EcosystemDefinition.coreTechnology` uses camelCase with capital T. Do not use `coreechnology` or `coretechnology` — both are silent runtime bugs that produce `undefined` in DB inserts.

**Why:** TypeScript's structural typing with `as any` casts silently accepts typos in object literals; only the DB insert reveals missing values.

**How to apply:** Copy the exact field name from `types.ts` before writing object literals for `EcosystemDefinition`.

## Identifiers
| Item | Value |
|---|---|
| Schema exports | `technologyRelationships`, `relationshipGraph`, `relationshipClusters`, `technologyEcosystems`, `dependencyGraph`, `conflictGraph`, `replacementGraph`, `relationshipRegistry`, `relationshipSnapshots` |
| EB summary type | `TechnologyRelationshipSummary` |
| EB fetch fn | `fetchTechnologyRelationshipSummary` |
| EB trigger fn | `triggerTechnologyRelationshipRebuild` |
| EB advisory fn | `buildTechnologyRelationshipAdvisory` |
| EB throttle | 220 cycles |
| EP count at boot | 246 |
| Relationship seed size | ~130 edges, 21 types, 54 technologies |
