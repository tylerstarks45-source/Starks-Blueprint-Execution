---
name: Executive Observation Engine
description: Build 011 — append-only cognitive nervous system; 8 tables, 8 EPs, 62 total EPs at boot.
---

## Rule
Observation is APPEND-ONLY (no UPDATE, no DELETE). Never blocks request path. All hooks are fire-and-forget.

**Why:** Observation records raw reality for Reflection to explain later. Mutable observations would introduce hindsight bias.

**How to apply:** Use `ingestObservation()` / convenience wrappers (`observeExecution`, `observeGoal`, `observePlanning`) from `executive-observation/observation-services.ts`. Never call DB tables directly from outside the registry.

## Key files
- `lib/executive-observation/observation-ingestion.ts` — 8-step pipeline per event
- `lib/executive-observation/observation-attention.ts` — 8-dimension score (0.00–1.00), pure
- `lib/executive-observation/observation-signal.ts` — 12-type signal classifier, pure
- `lib/executive-observation/observation-trend.ts` — 7 deterministic trend detectors
- `lib/executive-observation/observation-anomaly.ts` — 5 anomaly detectors (reports only, never fixes)
- `lib/executive-observation/observation-chain.ts` — chains anchor to execution > plan > goal > user_request
- `lib/executive-observation/observation-correlation.ts` — 7 correlation types, union-find clusters
- Routes: `/api/executive-observation/` (16 endpoints)

## Extension points (8)
observation-recorded, observation-chain-updated, attention-threshold-exceeded, signal-emitted, anomaly-detected, trend-detected, reflection-ready, observation-correlation-found
