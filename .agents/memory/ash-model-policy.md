---
name: ASH best-model policy
description: How ASH selects OpenRouter models — always frontier for user-facing, utility only for internal extraction; central source of truth.
---

# ASH best-model policy

All model selection for the ASH agent routes through `artifacts/api-server/src/lib/models.ts` — the single source of truth. Do NOT hardcode OpenRouter model strings at call sites.

- `MODELS` holds the canonical IDs (flagship / reasoning / swift / utility / research).
- `CHAINS` are ordered best-first fallback arrays. `chainFor(situation)` returns a fresh copy.
- `chainForAgentMode(mode)` maps frontend agent-mode ids → chains; `depthNoteForAgentMode(mode)` returns a system-prompt depth note.

**Rule:** anything the user actually sees (conversation, plan generation, generated marketing/email copy, build-step execution, diagnostics) MUST use a frontier model (via a chain). The lightweight `utility` model (gpt-4o-mini) is reserved ONLY for trivial internal work whose output is never shown to the user — e.g. JSON extraction / classification (`recoverSbepData`).

**Why:** Task #282 mandated best-model-regardless-of-cost for user-facing quality; agent modes express DEPTH/SCOPE, never cheap-vs-good.

**How to apply:**
- New user-facing AI call → pass `models: chainFor("reasoning" | "flagship" | ...)` (or `chainForAgentMode(mode)`), not `model:`.
- OpenRouter native fallback: `complete()`/`streamCompletion()` accept `models?: string[]`; they send it as the OpenRouter `models` array and pick `model = chain[0]`. A deprecated/rate-limited primary silently drops to the next-best.
- Frontend/backend alignment: `BuilderPage.jsx` `AI_MODES` ids (`fast|business|expert|empire`) must stay in lockstep with `chainForAgentMode`'s switch, and each mode's `.model` value (sent to build-engine execute-step) should match the chain's primary.

**Known gap (non-blocking):** `streamCompletion` attributes credit deduction + usage logging to the requested primary model, not the actually-served fallback model when OpenRouter routes down the chain. `complete()` already uses `result.model`. Fixing streaming needs parsing served-model from stream metadata.
