# Volume 3 — Runtime & Execution

**Status:** Framework established. No chapter has entered the Architecture phase yet.

## Purpose

The layer that actually executes work: routing requests to models, running tools and connector actions, processing async jobs, scheduling recurring work, and moving domain events through the system.

## Chapters

| # | Chapter | Status |
|---|---|---|
| 3.1 | [AI Orchestrator & Request Pipeline](./01-ai-orchestrator-request-pipeline.md) | Not Started |
| 3.2 | [Provider & Model Routing](./02-provider-model-routing.md) | Not Started |
| 3.3 | [Tool Execution & Connector Actions](./03-tool-execution-connector-actions.md) | Not Started |
| 3.4 | [Runtime Job Worker & Async Processing](./04-runtime-job-worker-async-processing.md) | Not Started |
| 3.5 | [Scheduler & Internal Cron Jobs](./05-scheduler-internal-cron-jobs.md) | Not Started |
| 3.6 | [Event Bus & Domain Event Processing](./06-event-bus-domain-event-processing.md) | Not Started |

---

Each chapter follows the fixed lifecycle defined in [the master index](../00-INDEX.md#the-chapter-lifecycle): Architecture → Architecture Review → Approval → Implementation → Compliance Audit → Gap Remediation → Final Audit → Optimization → Locked. New chapters may be added to this volume as ASH grows new capabilities in this domain; existing chapter numbers are never reused or renumbered once a chapter leaves "Not Started."
