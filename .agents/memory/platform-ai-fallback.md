---
name: Platform-level AI fallback vs per-user keys
description: When to add a no-setup platform fallback for a feature that normally requires a per-user API key
---

Some AI features (TTS, music, etc.) are wired to a provider that requires each user to bring their own API key (e.g. ElevenLabs). Most users won't have one, so the feature is effectively dead on arrival for new signups even though the code "works."

Fix: keep the premium per-user provider as the primary path (better quality/voices), but add a platform-level fallback using a Replit-managed AI Integration (e.g. `AI_INTEGRATIONS_OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_BASE_URL`, provisioned via `setupReplitAIIntegrations`) that requires zero user setup. Trigger the fallback exactly where the per-user-key check currently returns a `needs_credentials` response.

**Why:** A feature that only works after the user manually finds and pastes a third-party API key has near-zero real-world activation. A built-in fallback makes the feature usable immediately, with the premium option offered as an upgrade rather than a requirement.

**How to apply:** When adding this, only copy the specific capability needed from `.local/skills/ai-integrations-*/templates/lib/...` (e.g. just `/audio` for TTS) rather than the full template package (React hooks, DB schema) if the feature doesn't need them.
