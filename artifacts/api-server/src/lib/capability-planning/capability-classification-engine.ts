// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — Capability Classification Engine
// Groups capabilities into 16 domains. Assigns domain metadata.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { CapabilityDomainType, BusinessImpact } from "./types";

interface DomainSpec {
  domainName: string;
  domainDescription: string;
  businessImpact: BusinessImpact;
  basePriority: number;
}

export const DOMAIN_SPECS: Record<CapabilityDomainType, DomainSpec> = {
  leadership: {
    domainName: "Leadership",
    domainDescription: "Strategic leadership, executive decision-making, and organisational direction-setting capabilities.",
    businessImpact: "critical",
    basePriority: 1,
  },
  people: {
    domainName: "People & Talent",
    domainDescription: "Human capital capabilities: talent acquisition, development, performance management, and engagement.",
    businessImpact: "critical",
    basePriority: 2,
  },
  technology: {
    domainName: "Technology",
    domainDescription: "Core technology architecture, platforms, engineering practices, and software delivery capabilities.",
    businessImpact: "critical",
    basePriority: 3,
  },
  infrastructure: {
    domainName: "Infrastructure",
    domainDescription: "Cloud, on-premise, and network infrastructure management and reliability capabilities.",
    businessImpact: "high",
    basePriority: 4,
  },
  finance: {
    domainName: "Finance",
    domainDescription: "Financial planning, capital allocation, controls, reporting, and treasury capabilities.",
    businessImpact: "critical",
    basePriority: 5,
  },
  operations: {
    domainName: "Operations",
    domainDescription: "Core operational process design, quality management, supply chain, and performance measurement.",
    businessImpact: "high",
    basePriority: 6,
  },
  marketing: {
    domainName: "Marketing",
    domainDescription: "Demand generation, brand management, content, digital marketing, and campaign execution capabilities.",
    businessImpact: "high",
    basePriority: 7,
  },
  sales: {
    domainName: "Sales",
    domainDescription: "Sales pipeline management, revenue analytics, channel management, and customer acquisition capabilities.",
    businessImpact: "critical",
    basePriority: 8,
  },
  customer: {
    domainName: "Customer",
    domainDescription: "Customer experience design, support operations, journey management, and retention capabilities.",
    businessImpact: "critical",
    basePriority: 9,
  },
  knowledge: {
    domainName: "Knowledge",
    domainDescription: "Organisational knowledge management, market intelligence, research, and learning capabilities.",
    businessImpact: "medium",
    basePriority: 10,
  },
  security: {
    domainName: "Security",
    domainDescription: "Cybersecurity, information security, data protection, and incident response capabilities.",
    businessImpact: "critical",
    basePriority: 11,
  },
  governance: {
    domainName: "Governance",
    domainDescription: "Corporate governance, risk management, board oversight, and accountability framework capabilities.",
    businessImpact: "critical",
    basePriority: 12,
  },
  compliance: {
    domainName: "Compliance",
    domainDescription: "Regulatory compliance, policy management, audit, and legal risk management capabilities.",
    businessImpact: "high",
    basePriority: 13,
  },
  integrations: {
    domainName: "Integrations",
    domainDescription: "System integration, API management, data exchange, and inter-platform connectivity capabilities.",
    businessImpact: "medium",
    basePriority: 14,
  },
  automation: {
    domainName: "Automation",
    domainDescription: "Process automation, workflow automation, DevOps, and robotic process automation capabilities.",
    businessImpact: "medium",
    basePriority: 15,
  },
  ai: {
    domainName: "Artificial Intelligence",
    domainDescription: "AI/ML model development, deployment, governance, and monitoring capabilities.",
    businessImpact: "medium",
    basePriority: 16,
  },
};

export function classifyIntoDomains(
  domainTypes: CapabilityDomainType[],
  planId: string,
  reportId: string,
  businessId: number,
): { id: string; planId: string; reportId: string; businessId: number; domainType: CapabilityDomainType; domainName: string; domainDescription: string; businessImpact: BusinessImpact; priority: number; requirementCount: number; gapCount: number; criticalGapCount: number; overallMaturityScore: number; overallReadinessScore: number }[] {
  return domainTypes.map((dt) => {
    const spec = DOMAIN_SPECS[dt];
    return {
      id: randomUUID(),
      planId,
      reportId,
      businessId,
      domainType: dt,
      domainName: spec.domainName,
      domainDescription: spec.domainDescription,
      businessImpact: spec.businessImpact,
      priority: spec.basePriority,
      requirementCount: 0,
      gapCount: 0,
      criticalGapCount: 0,
      overallMaturityScore: 0,
      overallReadinessScore: 0,
    };
  });
}

export function getUniqueDomainTypes(capabilities: { domainType: CapabilityDomainType }[]): CapabilityDomainType[] {
  const seen = new Set<CapabilityDomainType>();
  for (const c of capabilities) seen.add(c.domainType);
  return Array.from(seen);
}
