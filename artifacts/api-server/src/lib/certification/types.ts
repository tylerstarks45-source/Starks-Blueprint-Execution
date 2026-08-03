// ── Build 045: Cognitive Certification & Launch Readiness Framework — Types
// Self-contained. No re-exports from @workspace/db.

// ── 21 Certification Domains ──────────────────────────────────────────────
export type CertificationDomain =
  | "executive_brain" | "cognitive_orchestrator" | "knowledge_graph"
  | "authority_framework" | "digital_operating_layer" | "connections_hub"
  | "business_intelligence" | "technology_intelligence" | "infrastructure_intelligence"
  | "planning_systems" | "execution_systems" | "observation_systems"
  | "learning_systems" | "reflection_systems" | "governance"
  | "memory" | "security" | "performance" | "reliability"
  | "scalability" | "extensibility";

export const CERTIFICATION_DOMAINS: CertificationDomain[] = [
  "executive_brain", "cognitive_orchestrator", "knowledge_graph",
  "authority_framework", "digital_operating_layer", "connections_hub",
  "business_intelligence", "technology_intelligence", "infrastructure_intelligence",
  "planning_systems", "execution_systems", "observation_systems",
  "learning_systems", "reflection_systems", "governance",
  "memory", "security", "performance", "reliability",
  "scalability", "extensibility",
];

// ── Validation types ──────────────────────────────────────────────────────
export type ValidationSeverity = "critical" | "high" | "medium" | "low";
export type DomainStatus       = "pass" | "fail" | "warning" | "skipped";
export type ReadinessLevel     = "not_ready" | "conditional" | "ready" | "certified";
export type CertRunStatus      = "pending" | "running" | "completed" | "failed";
export type SignoffStatus      = "pending" | "approved" | "rejected";

export interface ValidationFinding {
  ruleCode:  string;
  severity:  ValidationSeverity;
  passed:    boolean;
  message:   string;
  evidence?: Record<string, unknown>;
}

export interface DomainResult {
  domain:    CertificationDomain;
  status:    DomainStatus;
  score:     number;          // 0-1
  findings:  ValidationFinding[];
  evidence:  Record<string, unknown>;
}

export interface LawComplianceResult {
  lawName:   string;
  domain:    string;
  compliant: boolean;
  evidence:  Record<string, unknown>;
  findings:  string;
}

export interface HealthMetrics {
  domain:           CertificationDomain;
  available:        boolean;
  latencyMs:        number;
  reliabilityScore: number;
  coverageScore:    number;
  consistencyScore: number;
  confidenceScore:  number;
  healthScore:      number;
}

export interface LaunchReadinessResult {
  launchScore:      number;         // 0-100
  readinessLevel:   ReadinessLevel;
  criticalIssues:   string[];
  warnings:         string[];
  recommendations:  string[];
  blockedItems:     string[];
}

// ── Full certification summary (returned to EB) ───────────────────────────
export interface CertificationSummary {
  runId:              number | null;
  totalDomains:       number;
  passedDomains:      number;
  failedDomains:      number;
  warnedDomains:      number;
  overallScore:       number;
  readinessLevel:     ReadinessLevel;
  lawComplianceScore: number;
  launchReady:        boolean;
  signoffStatus:      SignoffStatus | null;
  computedAt:         Date;
}

// ── Architectural Laws (all permanent laws from Builds 001–044) ───────────
export interface ArchitecturalLaw {
  name:       string;
  build:      string;
  domain:     string;
  tableProof: string;   // table name that must exist
  epProof?:   string;   // EP ID that must be registered
}

export const ARCHITECTURAL_LAWS: ArchitecturalLaw[] = [
  { name: "Cognitive Foundation Law",       build: "001", domain: "cognitive_orchestrator",   tableProof: "cognitive_snapshots" },
  { name: "Cognitive Memory Law",           build: "004", domain: "memory",                    tableProof: "cognitive_artifacts" },
  { name: "Executive Goal Law",             build: "008", domain: "executive_brain",           tableProof: "executive_goals" },
  { name: "Executive Planning Law",         build: "009", domain: "planning_systems",          tableProof: "executive_plans" },
  { name: "Execution Safety Law",           build: "010", domain: "execution_systems",         tableProof: "execution_assignments" },
  { name: "Observation Integrity Law",      build: "011", domain: "observation_systems",       tableProof: "executive_observations" },
  { name: "Reflection Integrity Law",       build: "012", domain: "reflection_systems",        tableProof: "executive_reflections" },
  { name: "Governance Constitutional Law",  build: "014", domain: "governance",               tableProof: "governance_policies" },
  { name: "Business Analysis Law",          build: "016", domain: "business_intelligence",     tableProof: "business_analyses" },
  { name: "Opportunity Discovery Law",      build: "017", domain: "business_intelligence",     tableProof: "executive_opportunities" },
  { name: "Decision Authority Law",         build: "019", domain: "planning_systems",          tableProof: "executive_decisions" },
  { name: "Executive Strategy Law",         build: "020", domain: "planning_systems",          tableProof: "executive_strategies" },
  { name: "Strategic Planning Law",         build: "021", domain: "planning_systems",          tableProof: "strategic_programmes" },
  { name: "Capability Planning Law",        build: "022", domain: "planning_systems",          tableProof: "capability_plans" },
  { name: "Operational Planning Law",       build: "023", domain: "planning_systems",          tableProof: "operational_plans" },
  { name: "Execution Orchestration Law",    build: "024", domain: "execution_systems",         tableProof: "execution_orchestration_registry" },
  { name: "Authority Resolution Law",       build: "025", domain: "authority_framework",       tableProof: "authority_registry" },
  { name: "Execution Safety Law (Risk)",    build: "026", domain: "execution_systems",         tableProof: "execution_risk_registry" },
  { name: "Adapter Framework Law",          build: "030", domain: "extensibility",             tableProof: "adapter_registry" },
  { name: "Platform Infrastructure Law",    build: "032", domain: "infrastructure_intelligence",tableProof: "infrastructure_resources" },
  { name: "Systems Thinking Law",           build: "036", domain: "technology_intelligence",   tableProof: "systems_models" },
  { name: "Executive Optimization Law",     build: "037", domain: "executive_brain",           tableProof: "tradeoff_analyses" },
  { name: "Portfolio Optimization Law",     build: "038", domain: "executive_brain",           tableProof: "portfolio_analyses" },
  { name: "Executive Priority Law",         build: "039", domain: "executive_brain",           tableProof: "executive_priorities" },
  { name: "Unified Cognition Law",          build: "040", domain: "cognitive_orchestrator",    tableProof: "orchestration_registry" },
  { name: "Unified Knowledge Law",          build: "041", domain: "knowledge_graph",           tableProof: "knowledge_entities" },
  { name: "Unified Operating Law",          build: "043", domain: "digital_operating_layer",   tableProof: "dol_execution_sessions" },
  { name: "Unified Connection Law",         build: "044", domain: "connections_hub",           tableProof: "connection_providers" },
  { name: "Cognitive Certification Law",    build: "045", domain: "extensibility",             tableProof: "certification_runs" },
];

// ── Expected EP count after Build 045 ────────────────────────────────────
// H-07 fix: renamed from EXPECTED_EP_COUNT to MINIMUM_EP_COUNT to document that
// this is a floor (>=), not an exact target. Update after each build that adds new EPs.
export const MINIMUM_EP_COUNT = 398;   // Build 053: 398 cumulative EPs (390 + 8 BEB EPs)
// Keep a deprecated alias so any code still referencing the old name compiles and
// generates a type-level deprecation signal.
/** @deprecated Use MINIMUM_EP_COUNT */
export const EXPECTED_EP_COUNT = MINIMUM_EP_COUNT;
export const EXPECTED_BRAIN_COUNT = 6;

// ── EP IDs ────────────────────────────────────────────────────────────────
export const CERT_EP_IDS = {
  ARCHITECTURE_VALIDATION:    "cert.architecture.validation",
  LAW_COMPLIANCE:             "cert.law.compliance",
  DEPENDENCY_VALIDATION:      "cert.dependency.validation",
  HEALTH_CERTIFICATION:       "cert.health.certification",
  LAUNCH_READINESS:           "cert.launch.readiness",
  ADMINISTRATOR_CERTIFICATION:"cert.administrator.certification",
  AUDIT_SYNCHRONIZATION:      "cert.audit.synchronization",
  ADVISORY:                   "cert.advisory",
} as const;

export const CERT_THROTTLE_CYCLES = 320;
