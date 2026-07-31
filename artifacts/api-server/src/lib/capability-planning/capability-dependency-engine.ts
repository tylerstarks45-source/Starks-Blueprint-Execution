// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — Dependency Engine
// Maps: capability, technology, human, platform, and knowledge dependencies.
// 5 universal + domain-specific extras.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { CapabilityDependency, DependencyType, GapSeverity, CapabilityDomainType } from "./types";

interface DepTemplate {
  dependencyType: DependencyType;
  title: string;
  description: string;
  fromDomainType?: CapabilityDomainType;
  toDomainType?: CapabilityDomainType;
  severity: GapSeverity;
  mitigationNote: string;
}

const UNIVERSAL_DEPENDENCIES: DepTemplate[] = [
  {
    dependencyType: "human",
    title: "Leadership Capability Prerequisite",
    description: "All strategic capability domains depend on leadership capabilities being established first — without leadership alignment, capability-building efforts fragment and stall.",
    fromDomainType: "leadership",
    toDomainType: undefined,
    severity: "critical",
    mitigationNote: "Prioritise leadership capability development before launching domain-specific capability programmes.",
  },
  {
    dependencyType: "technology",
    title: "Core Technology Platform Dependency",
    description: "People, operations, finance, and customer capability domains depend on core technology platforms being available and reliable.",
    fromDomainType: "technology",
    toDomainType: undefined,
    severity: "high",
    mitigationNote: "Confirm technology platform readiness gates before launching technology-dependent capability programmes.",
  },
  {
    dependencyType: "platform",
    title: "Data Platform Dependency",
    description: "Knowledge, analytics, and AI capabilities depend on a stable and accessible data platform.",
    fromDomainType: "technology",
    toDomainType: "knowledge",
    severity: "high",
    mitigationNote: "Data platform must be operational before knowledge and AI capability development can begin.",
  },
  {
    dependencyType: "capability",
    title: "Governance-Finance Dependency",
    description: "Finance capabilities depend on governance frameworks being in place to ensure capital allocation decisions are properly controlled.",
    fromDomainType: "governance",
    toDomainType: "finance",
    severity: "medium",
    mitigationNote: "Establish governance frameworks before formalising capital allocation and financial control capabilities.",
  },
  {
    dependencyType: "knowledge",
    title: "Cross-Domain Knowledge Sharing",
    description: "Capability development across all domains depends on organisational knowledge sharing and learning infrastructure.",
    fromDomainType: "knowledge",
    toDomainType: undefined,
    severity: "medium",
    mitigationNote: "Build knowledge management infrastructure early to accelerate capability development across all domains.",
  },
];

const DOMAIN_EXTRAS: Partial<Record<CapabilityDomainType, DepTemplate[]>> = {
  ai: [
    {
      dependencyType: "technology",
      title: "AI-Infrastructure Dependency",
      description: "AI capabilities require adequate compute infrastructure, data pipelines, and model serving infrastructure.",
      fromDomainType: "infrastructure",
      toDomainType: "ai",
      severity: "high",
      mitigationNote: "Confirm infrastructure capacity for AI workloads before beginning AI capability development.",
    },
  ],
  security: [
    {
      dependencyType: "capability",
      title: "Security-Compliance Integration Dependency",
      description: "Security capabilities depend on compliance frameworks to define the regulatory baseline for security controls.",
      fromDomainType: "compliance",
      toDomainType: "security",
      severity: "high",
      mitigationNote: "Define compliance requirements before building security control capabilities.",
    },
  ],
  automation: [
    {
      dependencyType: "platform",
      title: "Automation-Integration Dependency",
      description: "Automation capabilities depend on integration infrastructure to connect systems that automation workflows orchestrate.",
      fromDomainType: "integrations",
      toDomainType: "automation",
      severity: "medium",
      mitigationNote: "Establish integration architecture before building automation capabilities that span multiple systems.",
    },
  ],
  sales: [
    {
      dependencyType: "platform",
      title: "CRM Platform Dependency",
      description: "Sales pipeline and revenue analytics capabilities depend on a functioning CRM platform.",
      fromDomainType: "technology",
      toDomainType: "sales",
      severity: "high",
      mitigationNote: "Prioritise CRM platform deployment before building advanced sales pipeline capabilities.",
    },
  ],
};

export function mapCapabilityDependencies(params: {
  planId: string;
  reportId: string;
  businessId: number;
  activeDomainTypes: CapabilityDomainType[];
}): CapabilityDependency[] {
  const { planId, reportId, businessId, activeDomainTypes } = params;
  const domainSet = new Set(activeDomainTypes);

  const templates: DepTemplate[] = [...UNIVERSAL_DEPENDENCIES];

  for (const dt of activeDomainTypes) {
    const extras = DOMAIN_EXTRAS[dt];
    if (extras) templates.push(...extras);
  }

  return templates
    .filter((t) => {
      // Only include cross-domain deps if both domains are present
      if (t.fromDomainType && !domainSet.has(t.fromDomainType)) return false;
      return true;
    })
    .map((tmpl) => ({
      id: randomUUID(),
      planId,
      reportId,
      businessId,
      dependencyType: tmpl.dependencyType,
      title: tmpl.title,
      description: tmpl.description,
      fromDomainType: tmpl.fromDomainType,
      toDomainType: tmpl.toDomainType,
      severity: tmpl.severity,
      mitigationNote: tmpl.mitigationNote,
    }));
}
