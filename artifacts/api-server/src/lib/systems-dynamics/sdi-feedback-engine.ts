// ── SDI Feedback Loop Engine ──────────────────────────────────────────────
// Detects reinforcing, balancing, delayed, and emergent loops across all systems.
// Pure computation — no I/O.

import type { FeedbackLoopProfile } from "./types";

export function getFeedbackLoopCatalog(): FeedbackLoopProfile[] {
  return [
    // ── Intelligence System ───────────────────────────────────────────────
    {
      systemKey: "intelligence-system",
      loopKey: "eb-context-enrichment-loop",
      loopName: "Executive Brain Context Enrichment Loop",
      loopType: "reinforcing",
      direction: "amplifying",
      strength: "strong",
      strengthScore: 0.88,
      triggerCondition: "Each EB cycle accumulates more intelligence summaries",
      effect: "Richer context notes → better AI responses → more useful actions → more data for next cycle",
      components: ["executive-brain", "intelligence-engines", "user-interactions", "ash-brain"],
      timeConstant: "medium-term",
      desirability: "beneficial",
      loopNotes: "Core positive feedback loop of the cognitive OS.",
    },
    {
      systemKey: "intelligence-system",
      loopKey: "brain-distillation-loop",
      loopName: "ASH Self-Improvement Distillation Loop",
      loopType: "reinforcing",
      direction: "amplifying",
      strength: "moderate",
      strengthScore: 0.72,
      triggerCondition: "Sessions generate outcomes; scheduler triggers brain distillation",
      effect: "Better lessons → improved guidance → better user outcomes → richer session data",
      components: ["ash-brain", "scheduler", "session-history", "reasoning-pipeline"],
      timeConstant: "long-term",
      desirability: "beneficial",
    },
    {
      systemKey: "intelligence-system",
      loopKey: "goal-plan-execution-loop",
      loopName: "Goal-Plan-Execution Cycle",
      loopType: "balancing",
      direction: "stabilizing",
      strength: "strong",
      strengthScore: 0.85,
      triggerCondition: "Goal set → plan generated → execution starts → observation feeds back",
      effect: "Execution outcomes correct goal progress; prevents runaway goal drift",
      components: ["executive-goal-engine", "executive-plan", "executive-execution", "executive-observation"],
      timeConstant: "medium-term",
      desirability: "beneficial",
    },

    // ── Business System ───────────────────────────────────────────────────
    {
      systemKey: "business-system",
      loopKey: "health-opportunity-loop",
      loopName: "Business Health → Opportunity Discovery Loop",
      loopType: "reinforcing",
      direction: "amplifying",
      strength: "moderate",
      strengthScore: 0.68,
      triggerCondition: "Business health scores computed → opportunity discovery uses them as input",
      effect: "Better health data → more precise opportunities → better decisions → improved business health",
      components: ["business-health-engine", "opportunity-discovery", "decision-intelligence"],
      timeConstant: "medium-term",
      desirability: "beneficial",
    },
    {
      systemKey: "business-system",
      loopKey: "portfolio-complexity-loop",
      loopName: "Portfolio Growth Complexity Loop",
      loopType: "reinforcing",
      direction: "amplifying",
      strength: "moderate",
      strengthScore: 0.62,
      triggerCondition: "User adds more businesses to portfolio",
      effect: "More businesses → more data to analyze → more opportunities discovered → user adds more businesses",
      components: ["business-registry", "opportunity-discovery", "business-health-engine"],
      timeConstant: "long-term",
      desirability: "beneficial",
    },

    // ── Execution System ──────────────────────────────────────────────────
    {
      systemKey: "execution-system",
      loopKey: "job-queue-saturation-loop",
      loopName: "Job Queue Saturation Loop",
      loopType: "reinforcing",
      direction: "amplifying",
      strength: "moderate",
      strengthScore: 0.71,
      triggerCondition: "High user load → job queue fills faster than worker can drain",
      effect: "Queue growth → slower response times → user retry → more jobs → queue further saturates",
      components: ["runtime-worker", "job-scheduler", "api-server"],
      timeConstant: "immediate",
      desirability: "harmful",
      loopNotes: "Primary risk loop. Mitigation: job priority queuing + hung job reclaim watchdog.",
    },
    {
      systemKey: "execution-system",
      loopKey: "authority-risk-balancing-loop",
      loopName: "Authority-Risk Balancing Loop",
      loopType: "balancing",
      direction: "dampening",
      strength: "strong",
      strengthScore: 0.80,
      triggerCondition: "Execution action proposed → risk assessment performed → authority check enforced",
      effect: "High-risk actions require higher authority → prevents dangerous autonomous execution",
      components: ["authority-resolution", "risk-assessment", "execution-orchestration"],
      timeConstant: "immediate",
      desirability: "beneficial",
    },

    // ── Technology System ─────────────────────────────────────────────────
    {
      systemKey: "technology-system",
      loopKey: "tech-evolution-recommendation-loop",
      loopName: "Technology Evolution Feedback Loop",
      loopType: "delayed",
      direction: "stabilizing",
      strength: "weak",
      strengthScore: 0.45,
      triggerCondition: "Technology lifecycle changes detected in catalog",
      effect: "Deprecation alerts → upgrade recommendations → platform tech modernization → better lifecycle scores",
      components: ["tech-evolution-engine", "recommendation-engine", "platform-infrastructure"],
      timeConstant: "long-term",
      desirability: "beneficial",
      loopNotes: "Long delay between detection and action makes this loop weak but important.",
    },

    // ── Infrastructure System ─────────────────────────────────────────────
    {
      systemKey: "infrastructure-system",
      loopKey: "connection-pool-pressure-loop",
      loopName: "DB Connection Pool Pressure Loop",
      loopType: "balancing",
      direction: "dampening",
      strength: "moderate",
      strengthScore: 0.73,
      triggerCondition: "Request volume exceeds available pool connections",
      effect: "Pool exhaustion → request queuing → reduced throughput → natural backpressure on new requests",
      components: ["connection-pool", "runtime-worker", "api-server"],
      timeConstant: "immediate",
      desirability: "neutral",
    },

    // ── Integration System ─────────────────────────────────────────────────
    {
      systemKey: "integration-system",
      loopKey: "credential-failure-propagation-loop",
      loopName: "Credential Failure Propagation Loop",
      loopType: "emergent",
      direction: "amplifying",
      strength: "weak",
      strengthScore: 0.38,
      triggerCondition: "External API credential expires or is revoked",
      effect: "Connector fails → dependent features degrade → user discovers in production → cascades to related features",
      components: ["connections-hub", "adapter-framework", "social-oauth", "browser-agent"],
      timeConstant: "immediate",
      desirability: "harmful",
      loopNotes: "Graceful degradation mitigates but does not eliminate this loop.",
    },
  ];
}

export function identifyHarmfulLoops(loops: FeedbackLoopProfile[]): FeedbackLoopProfile[] {
  return loops.filter(l => l.desirability === "harmful");
}

export function getStrongestLoops(loops: FeedbackLoopProfile[], topN = 5): FeedbackLoopProfile[] {
  return [...loops].sort((a, b) => b.strengthScore - a.strengthScore).slice(0, topN);
}

export function getLoopsByType(loops: FeedbackLoopProfile[], type: string): FeedbackLoopProfile[] {
  return loops.filter(l => l.loopType === type);
}
