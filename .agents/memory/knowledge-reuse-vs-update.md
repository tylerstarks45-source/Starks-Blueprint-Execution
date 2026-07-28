---
name: Knowledge reuse vs update-in-place
description: How the Research & Knowledge Engine decides skip-research (reuse), insert-new, or update-existing for a knowledge entry.
---

Two distinct lookup functions exist over the same `ash_knowledge_entries` table, answering two different questions:
- `findReusableKnowledge()` — "is there already a fresh, high-confidence entry that means I can skip research entirely?" Requires relevance AND freshness (per-research-type staleness threshold) AND confidence above the reuse bar.
- `findExistingEntryForTopic()` — "regardless of staleness/confidence, is this the same topic as an entry I already have?" Used only *after* new research completes, to decide UPDATE vs INSERT.

**Why:** without the second lookup, a stale entry on the same topic would get silently duplicated every time research re-ran, instead of being refreshed in place.

**How to apply:** the topic-match relevance threshold must be the same as (not stricter than) the reuse threshold — making it stricter caused real stale-but-matching entries to fail the match and duplicate instead of update (caught by tests). New research is only written (insert or update) when its own confidence clears the existing minimum-to-save bar; low-confidence new research leaves existing good knowledge untouched.
