---
name: Cognitive Foundation registries
description: Registry-as-data pattern for ASH Brains (brain/capability/extension-point registries) — the rules future Brain additions must follow.
---

# Cognitive Foundation registries

The api-server has a platform-level registry layer (`lib/cognitive-foundation/` in the api-server) that every ASH Brain registers into at boot.

**The rule:** a new Brain ships its own registration module and calls `registerBrain(...)` (plus optional `registerExtension(...)`) during bootstrap — adding a Brain must never require editing existing files. Consumers discover brains/capabilities/extension points by reading the registry, never from hardcoded lists.

**Why:** the approved Master Architecture requires future intelligence systems to plug in without modifying existing architecture (reuse→extend→refactor→replace law). Registries-as-data is how that is enforced; hardcoded lists silently drift.

**How to apply:**
- Registries are in-process, rebuilt at boot (same pattern as the Validation Engine rule registry). Do not move them to Postgres without an approved spec.
- Health probes must stay cheap (single-row table probe, config presence, in-process checks). The registry enforces a probe timeout and caches snapshots; hot request paths may only read the cache (zero I/O, fail-open) — never run live probes inside a user request.
- Health aggregation is worst-of across `healthy|unknown|warning|degraded|offline`; throwing/hung probe → offline, missing probe → unknown.
- Capability entries transcribe the locked spec chapters' Capability Contracts verbatim (spec section, maturity notation like "L2/L3", implemented/partial/target/deferred). If a chapter revision changes contracts, the registration must be updated in the same change — registry drift from the locked spec is a bug.
- Registering an extension against an undeclared extension point throws by design (fail loudly beats typo no-ops).
- Anything appended to the Executive Brain plan block from health data must be clipped/bounded — probe messages can contain raw error text.
