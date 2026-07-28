import { registerBusinessEventSubscriber } from "./events";
import { computeBusinessHealth } from "../health-monitor";
import { logger } from "../logger";

// ─── Event-driven health recompute (Phase 1.5A event-flow hardening) ───────
// computeBusinessHealth is heuristic/DB-signal-based (no live network or AI
// calls — see health-monitor.ts), so it's safe and cheap to run inline as
// part of event processing. This gives the spec's example event flows
// ("project completed -> recompute health", "integration connected ->
// recompute health") real, testable behavior instead of relying solely on
// the periodic recompute sweep in scheduler.ts to eventually catch up.
registerBusinessEventSubscriber(["project.completed", "integration.connected"], async (event) => {
  try {
    await computeBusinessHealth(event.businessId);
  } catch (err) {
    logger.warn({ err, businessId: event.businessId, eventType: event.eventType }, "Business Intelligence: event-driven health recompute failed (non-fatal)");
  }
});
