---
name: Root-cause research loop design
description: Why autonomous root-cause diagnosis of unresolved system errors uses web-search completions instead of the URL-based browser agent, and how it gates auto-apply vs pending approval.
---

When a whitelisted self-heal action (reconnect/retry/restart) fails, escalation runs a research step before creating a Pending Approval, rather than escalating blind.

**Why not the real browser agent?** The browser agent requires a known starting URL to navigate to. Root-cause research starts from an arbitrary error message with no URL — there's no "search and compare" entry point for bare queries. A web-grounded search completion (search model → synthesis model producing structured diagnosis/fix/confidence JSON) satisfies the research intent without forcing a URL-less flow into a URL-based tool.

**Auto-apply gate:** research confidence alone must not be enough to skip human review. Auto-re-applying the same whitelisted fix requires BOTH the existing Operations Mode auto-fix permission AND the research step explicitly confirming it's a known/previously-whitelisted failure mode; anything below the confidence bar or outside that whitelist still falls through to Pending Approval.

**Why:** keeps auto-apply strictly bounded to "the platform already knows how to fix this and is highly confident," so novel or ambiguous failures always get a human in the loop — never throws, always returns a result so a decision can still be made even on research failure.
