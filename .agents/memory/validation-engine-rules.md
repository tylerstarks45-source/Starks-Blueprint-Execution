---
name: Validation Engine rule registry
description: How Phase 1.4's modular Validation Engine is structured and how to extend it with a new rule.
---

`planning-engine/validation.ts` is now a thin adapter — all rule logic lives in `planning-engine/validation-engine/`. The core runner (`validation-engine/index.ts`) has zero domain knowledge; it just runs every rule in `rules/index.ts`'s `ALL_VALIDATION_RULES` array against a shared `ValidationContext` and merges issues.

**To add a new validation rule:** write a file implementing `ValidationRule` (`{ id, description, evaluate(ctx) }`) and append it to `rules/index.ts`. Nothing else changes.

Existing rules and what makes each one genuinely rule-based rather than a flat keyword list:
- `credential-rule.ts` — matches against the connector registry (`listConnectors()`), not a hand-maintained keyword→credential map. New connectors extend this rule automatically.
- `integration-rule.ts` — flags platforms ASH has NO connector for at all (distinct from "connector exists but not connected").
- `api-requirement-rule.ts` — structural, keyed off `task.assignedEngine`, checks platform-level env vars (not per-user credentials).
- `tool-requirement-rule.ts` — structural sanity check that `assignedEngine` is one of the platform's known engines (protects against a hallucinated engine value reaching execution unvalidated).
- `file-requirement-rule.ts` — unchanged file-reference check, just moved into the registry shape.
- `approval-rule.ts` — delegates risk detection to `risk-detector.ts`'s extensible `RISK_CATEGORIES` table (financial/destructive/bulk-communication/irreversible-publish/account-security), each with its own regex patterns and risk level. Add a new risk category there, not in the rule itself.

**Why:** the user explicitly asked to replace simple keyword-based validation with something "rule-based and easily extensible... avoid relying solely on keyword matching whenever possible" — this is the shape that satisfies that without becoming a second parallel validation system.
