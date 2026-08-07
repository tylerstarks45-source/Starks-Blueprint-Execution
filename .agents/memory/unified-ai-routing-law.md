---
name: Unified AI Routing Law (Permanent Architectural Directive)
description: OpenRouter is the only AI routing provider. All AI calls go through lib/openrouter.ts + lib/models.ts. No duplicates, no bypasses, no hardcoded providers.
---

## Rule (PERMANENT — applies to every future build)
All AI completions must use:
- `lib/openrouter.ts` → `complete()` or `streamCompletion()`
- `lib/models.ts` → `chainFor(situation)` or `chainForAgentMode(mode)` for model selection
- API key: `process.env.OPENROUTER_API_KEY` — never create a second key or a duplicate

## What already exists (do NOT duplicate)
- `lib/openrouter.ts` — Core engine. Reads OPENROUTER_API_KEY. Native fetch to `https://openrouter.ai/api/v1/chat/completions`. Credit checking (FOUNDER_ADMIN bypass), usage logging in `openrouter_usage` table, credit deduction.
- `lib/models.ts` — Single source of truth for all model IDs + fallback chains. MODELS: flagship (claude-opus-4-5), reasoning (claude-3-5-sonnet), swift (gpt-4o), utility (gpt-4o-mini), research (perplexity/llama-3.1-sonar-large-128k-online). CHAINS: fallback-ordered. chainFor(situation), chainForAgentMode(mode), resolveAgentMode().
- `lib/connectors/openrouter-connector.ts` — connector wrapper
- `routes/openrouter.ts` — REST endpoints

## Key clarification
OpenAI model IDs (`openai/gpt-4o`, `openai/gpt-4o-mini`) are valid OpenRouter model identifiers — they do NOT constitute a direct OpenAI bypass. The call still goes through `openrouter.ai`. This is correct and intentional.

## How to add a new AI capability
1. Add a new model ID to `MODELS` in `lib/models.ts` if needed
2. Add or extend a chain in `CHAINS`
3. Call `complete()` or `streamCompletion()` from `lib/openrouter.ts` with the chain

## Verification checklist (required before each build)
- [ ] Existing OpenRouter integration reused
- [ ] Existing API key reused (OPENROUTER_API_KEY)
- [ ] Existing routing logic reused (lib/models.ts chains)
- [ ] No duplicate AI routing introduced
- [ ] No direct provider bypass (openai.com, anthropic.com called directly)
- [ ] Dynamic model selection preserved (chains, not hardcoded single model)

**Why:** Permanent Architectural Directive from the platform owner. Deviation risks fragmented billing, inconsistent model selection, duplicate API keys, and broken credit tracking.
