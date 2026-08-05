// Build 056 — Unified Revenue, Commerce & Monetization Platform (URCMP)
// Extension points declaration

import { declareExtensionPoint } from "../cognitive-foundation/index.js";

export function declareURCMPExtensionPoints(): void {
  declareExtensionPoint({
    id: "urcmp.catalog.pre-publish",
    description: "Intercept catalog before it is published — validate completeness, apply SEO rules, enforce governance policy.",
    declaredBy: "unified-revenue-commerce",
  });
  declareExtensionPoint({
    id: "urcmp.offer.pricing-check",
    description: "Validate offer pricing against registered pricing models and regional rules before activation.",
    declaredBy: "unified-revenue-commerce",
  });
  declareExtensionPoint({
    id: "urcmp.subscription.lifecycle",
    description: "Hook into subscription state transitions (trial → active, active → past_due, cancelled) for downstream automation.",
    declaredBy: "unified-revenue-commerce",
  });
  declareExtensionPoint({
    id: "urcmp.checkout.readiness",
    description: "Inject additional checkout readiness validators — payment gateway presence, legal compliance, fulfillment config.",
    declaredBy: "unified-revenue-commerce",
  });
  declareExtensionPoint({
    id: "urcmp.revenue.forecast",
    description: "Extend revenue forecast engine with custom growth models, market signals, or external data inputs.",
    declaredBy: "unified-revenue-commerce",
  });
  declareExtensionPoint({
    id: "urcmp.contract.acceptance",
    description: "React to contract acceptance events — trigger onboarding processes, billing setup, or customer lifecycle updates.",
    declaredBy: "unified-revenue-commerce",
  });
  declareExtensionPoint({
    id: "urcmp.governance.audit",
    description: "Register custom commerce governance rules that run during the catalog health and compliance audit cycle.",
    declaredBy: "unified-revenue-commerce",
  });
  declareExtensionPoint({
    id: "urcmp.intelligence.advisory",
    description: "Inject additional revenue intelligence signals into the Executive Brain URCMP advisory (monetization gaps, pricing optimisation).",
    declaredBy: "unified-revenue-commerce",
  });
}
