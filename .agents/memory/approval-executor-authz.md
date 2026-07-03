---
name: Approval executor resource-ownership authz
description: Autonomous-action executor must re-check target-resource ownership, not just approval-row ownership.
---

When ASH autonomous actions run through an approval gate, the approve/revert
routes only verify that the `pending_approvals` row belongs to the caller. The
executor then mutates a target resource (e.g. `landing_pages`) using an id taken
from the approval's JSON `payload`/`undoPayload`.

**Rule:** every executor action must independently verify the target resource is
owned by `approval.userId` (scope the SQL with `AND user_id = $n` and fail closed
when `rowCount === 0`). Never trust the id in the payload alone.

**Why:** the payload is arbitrary JSON written when the approval was created; a
stale or tampered id could point at another tenant's row, giving a cross-tenant
write / IDOR. Approval-row ownership does not imply target-resource ownership.

**How to apply:** when adding a new action to `approval-executor.ts`, add the
ownership predicate to both the forward action and its revert branch. `landing_pages`
carries `user_id` (owner) and `system_instance_id`.
