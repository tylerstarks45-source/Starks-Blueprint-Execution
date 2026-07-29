---
name: markTaskComplete "no active task" quirk
description: markTaskComplete can fail with "No active task to mark complete" even though getProjectTask shows the task correctly as MAIN_PENDING/MAIN_IN_PROGRESS.
---

Observed (main-repl session, after a memory-compaction event mid-session):
while actively implementing an assigned main-repl project task, `markTaskComplete({ task_ref })` returned `{ outcome: "no_active_task", text: "No active task to mark complete." }` even though `getProjectTask({ taskRef })` showed the task's own `state` as `MAIN_PENDING` (and later `MAIN_IN_PROGRESS` after calling `markTaskInProgress`). The task record's `state` field and whatever binding `markTaskComplete` uses to find "the active task for this session" appear to be tracked separately — transitioning the task's state does not necessarily fix the binding.

Tried and did not fix it: calling `markTaskInProgress` first (the task's state updated correctly to `MAIN_IN_PROGRESS`, confirmed via a fresh `getProjectTask` read immediately before retrying), then retrying `markTaskComplete` — failed identically both immediately after and on a later retry with minimal arguments. Not a timing/propagation race: state was re-verified fresh immediately before the failing retry.

**Why this matters:** don't loop on retrying `markTaskComplete` more than twice once `markTaskInProgress` has failed to fix it — this looks like a session/platform-level assignment desync (possibly related to mid-session memory compaction), not something fixable by more task-state API calls from within the session. The underlying code/doc deliverables are not lost or invalid; only the mechanical "mark complete" transition is blocked.

**How to apply:** if this recurs — verify the task's state via `getProjectTask`, try `markTaskInProgress` once as a recovery attempt, retry `markTaskComplete` once or twice, and if it still returns `no_active_task`, stop retrying and report to the user that the work is complete and verified but the task system couldn't mechanically close the task — let them know the task list may still show it as active/in-progress until that's resolved on the platform side.
