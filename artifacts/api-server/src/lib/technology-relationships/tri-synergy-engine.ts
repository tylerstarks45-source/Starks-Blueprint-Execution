// ── TRI Synergy Engine ──────────────────────────────────────────────────────
// Calculates deterministic synergy scores for technology pairs.
// 7 synergy dimensions: performance gain, operational gain, cost reduction,
// reliability improvement, developer productivity, execution throughput, maintainability.
// Real synergy data arrives via EP_TRI_SYNERGY_CALCULATED.

import type { SynergyScore } from "./types";
import type { TechnologyRelationship } from "./types";

// ── Synergy profiles for high-value pairs ─────────────────────────────────
// Keys are sorted: "a:b" where a < b alphabetically.
interface SynergyProfile {
  performanceGain:        number;
  operationalGain:        number;
  costReduction:          number;
  reliabilityImprovement: number;
  developerProductivity:  number;
  executionThroughput:    number;
  maintainability:        number;
  notes?: string;
}

function sortedKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const SYNERGY_PROFILES: Record<string, SynergyProfile> = {
  // postgresql + pgvector: tight integration, zero network hop
  [sortedKey("postgresql:database", "pgvector:extension")]:
    { performanceGain: 0.80, operationalGain: 0.92, costReduction: 0.88, reliabilityImprovement: 0.90, developerProductivity: 0.88, executionThroughput: 0.80, maintainability: 0.92, notes: "pgvector shares PostgreSQL infrastructure — no separate vector DB to operate." },

  // postgresql + redis: cache reduces DB read load substantially
  [sortedKey("postgresql:database", "redis:cache")]:
    { performanceGain: 0.88, operationalGain: 0.80, costReduction: 0.75, reliabilityImprovement: 0.82, developerProductivity: 0.78, executionThroughput: 0.90, maintainability: 0.78, notes: "Redis as L1 cache reduces PostgreSQL IOPS by 60–80% for read-heavy workloads." },

  // openrouter + tavily: search-augmented generation
  [sortedKey("openrouter:platform", "tavily:search_api")]:
    { performanceGain: 0.75, operationalGain: 0.82, costReduction: 0.70, reliabilityImprovement: 0.80, developerProductivity: 0.85, executionThroughput: 0.75, maintainability: 0.85, notes: "Tavily search + OpenRouter LLM = grounded AI responses with real-time data." },

  // playwright + chromium: native pair
  [sortedKey("playwright:automation", "chromium:browser")]:
    { performanceGain: 0.92, operationalGain: 0.90, costReduction: 0.95, reliabilityImprovement: 0.92, developerProductivity: 0.92, executionThroughput: 0.90, maintainability: 0.90, notes: "Playwright + Chromium: native pair — no compatibility overhead." },

  // stripe + resend: payment-triggered transactional email
  [sortedKey("stripe:payments", "resend:email")]:
    { performanceGain: 0.72, operationalGain: 0.85, costReduction: 0.78, reliabilityImprovement: 0.82, developerProductivity: 0.90, executionThroughput: 0.72, maintainability: 0.88, notes: "Stripe webhooks + Resend = reliable transactional email for payment events." },

  // nodejs + bun: drop-in speed upgrade for compatible workloads
  [sortedKey("nodejs:runtime", "bun:runtime")]:
    { performanceGain: 0.85, operationalGain: 0.60, costReduction: 0.72, reliabilityImprovement: 0.62, developerProductivity: 0.72, executionThroughput: 0.88, maintainability: 0.65, notes: "Bun can accelerate Node.js workloads by 2–3x for compatible tooling." },

  // github + vercel: automatic deploy on push
  [sortedKey("github:platform", "vercel:platform")]:
    { performanceGain: 0.72, operationalGain: 0.92, costReduction: 0.80, reliabilityImprovement: 0.85, developerProductivity: 0.95, executionThroughput: 0.75, maintainability: 0.90, notes: "Git push → automatic Vercel preview deploy: highest developer velocity for frontend." },

  // clerk + postgresql: auth + data
  [sortedKey("clerk:auth", "postgresql:database")]:
    { performanceGain: 0.72, operationalGain: 0.85, costReduction: 0.78, reliabilityImprovement: 0.85, developerProductivity: 0.88, executionThroughput: 0.72, maintainability: 0.88, notes: "Clerk manages identity; PostgreSQL stores app data — clean separation of concerns." },

  // cloudflare r2 + vercel: zero-egress edge storage
  [sortedKey("cloudflare:r2", "vercel:platform")]:
    { performanceGain: 0.85, operationalGain: 0.82, costReduction: 0.90, reliabilityImprovement: 0.80, developerProductivity: 0.82, executionThroughput: 0.85, maintainability: 0.82, notes: "R2 zero-egress + Vercel edge = global low-latency delivery with no egress charges." },

  // stripe + hubspot: revenue → CRM
  [sortedKey("stripe:payments", "hubspot:crm")]:
    { performanceGain: 0.68, operationalGain: 0.85, costReduction: 0.72, reliabilityImprovement: 0.78, developerProductivity: 0.80, executionThroughput: 0.68, maintainability: 0.82, notes: "Stripe payment data enriches HubSpot contacts for full revenue-lifecycle visibility." },

  // posthog + stripe: conversion analytics
  [sortedKey("posthog:analytics", "stripe:payments")]:
    { performanceGain: 0.65, operationalGain: 0.82, costReduction: 0.72, reliabilityImprovement: 0.75, developerProductivity: 0.82, executionThroughput: 0.65, maintainability: 0.82, notes: "PostHog event funnels + Stripe revenue events = full conversion analytics stack." },

  // groq + openrouter: ultra-low-latency route
  [sortedKey("groq:cloud", "openrouter:platform")]:
    { performanceGain: 0.92, operationalGain: 0.80, costReduction: 0.75, reliabilityImprovement: 0.80, developerProductivity: 0.78, executionThroughput: 0.95, maintainability: 0.80, notes: "Groq as the latency-critical backend inside OpenRouter routing: near-instant responses." },

  // n8n + postgresql: workflow persistence
  [sortedKey("n8n:automation", "postgresql:database")]:
    { performanceGain: 0.72, operationalGain: 0.88, costReduction: 0.80, reliabilityImprovement: 0.85, developerProductivity: 0.85, executionThroughput: 0.72, maintainability: 0.85, notes: "n8n + PostgreSQL: open-source automation stack with durable workflow state." },

  // docker + postgresql: portable dev environment
  [sortedKey("docker:platform", "postgresql:database")]:
    { performanceGain: 0.72, operationalGain: 0.90, costReduction: 0.85, reliabilityImprovement: 0.82, developerProductivity: 0.92, executionThroughput: 0.72, maintainability: 0.88, notes: "Docker + PostgreSQL = reproducible dev/test environments for all contributors." },

  // github + slack: CI/CD notifications
  [sortedKey("github:platform", "slack:platform")]:
    { performanceGain: 0.62, operationalGain: 0.88, costReduction: 0.72, reliabilityImprovement: 0.80, developerProductivity: 0.90, executionThroughput: 0.62, maintainability: 0.88, notes: "GitHub Actions + Slack: automated PR/deploy status → team channels." },
};

// ── Default synergy for relationship-based pairs ───────────────────────────
const DEFAULT_SYNERGY_BY_TYPE: Record<string, SynergyProfile> = {
  works_best_with: { performanceGain: 0.75, operationalGain: 0.78, costReduction: 0.70, reliabilityImprovement: 0.75, developerProductivity: 0.78, executionThroughput: 0.75, maintainability: 0.75 },
  complements:     { performanceGain: 0.68, operationalGain: 0.72, costReduction: 0.65, reliabilityImprovement: 0.70, developerProductivity: 0.72, executionThroughput: 0.68, maintainability: 0.70 },
  enhances:        { performanceGain: 0.80, operationalGain: 0.75, costReduction: 0.68, reliabilityImprovement: 0.75, developerProductivity: 0.78, executionThroughput: 0.78, maintainability: 0.72 },
  accelerates:     { performanceGain: 0.88, operationalGain: 0.72, costReduction: 0.72, reliabilityImprovement: 0.72, developerProductivity: 0.75, executionThroughput: 0.90, maintainability: 0.70 },
  optimizes:       { performanceGain: 0.85, operationalGain: 0.78, costReduction: 0.80, reliabilityImprovement: 0.78, developerProductivity: 0.75, executionThroughput: 0.82, maintainability: 0.78 },
  enables:         { performanceGain: 0.72, operationalGain: 0.80, costReduction: 0.68, reliabilityImprovement: 0.75, developerProductivity: 0.82, executionThroughput: 0.72, maintainability: 0.78 },
  secures:         { performanceGain: 0.60, operationalGain: 0.82, costReduction: 0.65, reliabilityImprovement: 0.88, developerProductivity: 0.75, executionThroughput: 0.60, maintainability: 0.82 },
  extends:         { performanceGain: 0.78, operationalGain: 0.88, costReduction: 0.82, reliabilityImprovement: 0.85, developerProductivity: 0.85, executionThroughput: 0.78, maintainability: 0.88 },
};

// ── Relationship types that generate synergy scores ────────────────────────
const SYNERGY_RELATIONSHIP_TYPES = new Set([
  "works_best_with", "complements", "enhances", "accelerates",
  "optimizes", "enables", "secures", "extends",
]);

// ── Composite synergy score (equal-weighted) ───────────────────────────────
function compositeScore(p: SynergyProfile): number {
  return Math.round((
    p.performanceGain + p.operationalGain + p.costReduction +
    p.reliabilityImprovement + p.developerProductivity +
    p.executionThroughput + p.maintainability
  ) / 7 * 1000) / 1000;
}

// ── Compute synergy for one relationship ───────────────────────────────────
export function computeSynergy(rel: TechnologyRelationship): SynergyScore | null {
  if (!SYNERGY_RELATIONSHIP_TYPES.has(rel.relationshipType)) return null;

  const profileKey = sortedKey(rel.sourceTechnologyKey, rel.targetTechnologyKey);
  const profile = SYNERGY_PROFILES[profileKey] ??
                  DEFAULT_SYNERGY_BY_TYPE[rel.relationshipType];

  if (!profile) return null;

  // Apply relationship strength as a scalar
  const s = rel.strength;
  const scaled: SynergyProfile = {
    performanceGain:        profile.performanceGain * s,
    operationalGain:        profile.operationalGain * s,
    costReduction:          profile.costReduction * s,
    reliabilityImprovement: profile.reliabilityImprovement * s,
    developerProductivity:  profile.developerProductivity * s,
    executionThroughput:    profile.executionThroughput * s,
    maintainability:        profile.maintainability * s,
  };

  return {
    technologyKeyA:         rel.sourceTechnologyKey,
    technologyKeyB:         rel.targetTechnologyKey,
    ...scaled,
    compositeScore:         compositeScore(scaled),
  };
}

// ── Batch compute ──────────────────────────────────────────────────────────
export function computeAllSynergies(relationships: TechnologyRelationship[]): SynergyScore[] {
  const seen = new Set<string>();
  const scores: SynergyScore[] = [];

  for (const rel of relationships) {
    const key = sortedKey(rel.sourceTechnologyKey, rel.targetTechnologyKey);
    if (seen.has(key)) continue;
    seen.add(key);
    const score = computeSynergy(rel);
    if (score) scores.push(score);
  }

  return scores.sort((a, b) => b.compositeScore - a.compositeScore);
}
