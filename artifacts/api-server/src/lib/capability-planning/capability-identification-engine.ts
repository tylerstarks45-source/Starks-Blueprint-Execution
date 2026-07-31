// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — Capability Identification Engine
// Derives required capabilities from Strategic Programs and Initiatives.
// Each programme type maps to a set of required capabilities across domains.
// ─────────────────────────────────────────────────────────────────────────────
import type { CapabilityDomainType, MaturityLevel, BusinessCriticality } from "./types";

export interface RequiredCapabilitySpec {
  capabilityName: string;
  capabilityDescription: string;
  domainType: CapabilityDomainType;
  requiredLevel: MaturityLevel;
  businessCriticality: BusinessCriticality;
  priority: number;
}

// Maps each programme type to the capabilities it requires
const PROGRAM_CAPABILITIES: Record<string, RequiredCapabilitySpec[]> = {
  revenue_program: [
    { capabilityName: "Sales Pipeline Management", capabilityDescription: "Ability to systematically manage and advance sales opportunities through a defined pipeline.", domainType: "sales", requiredLevel: "managed", businessCriticality: "critical", priority: 1 },
    { capabilityName: "Revenue Analytics", capabilityDescription: "Ability to measure, analyse, and forecast revenue performance across channels.", domainType: "sales", requiredLevel: "defined", businessCriticality: "high", priority: 2 },
    { capabilityName: "Marketing Demand Generation", capabilityDescription: "Ability to generate qualified demand through targeted marketing programmes.", domainType: "marketing", requiredLevel: "defined", businessCriticality: "high", priority: 3 },
    { capabilityName: "Customer Acquisition Process", capabilityDescription: "Defined and repeatable process for converting prospects to paying customers.", domainType: "customer", requiredLevel: "defined", businessCriticality: "critical", priority: 4 },
    { capabilityName: "Pricing & Packaging Capability", capabilityDescription: "Ability to design, test, and manage pricing models aligned with market and strategic objectives.", domainType: "finance", requiredLevel: "basic", businessCriticality: "medium", priority: 5 },
  ],
  operations_program: [
    { capabilityName: "Process Design & Optimisation", capabilityDescription: "Ability to design, document, and systematically improve operational processes.", domainType: "operations", requiredLevel: "managed", businessCriticality: "critical", priority: 1 },
    { capabilityName: "Operational Performance Measurement", capabilityDescription: "Ability to define, collect, and act on operational performance metrics.", domainType: "operations", requiredLevel: "defined", businessCriticality: "high", priority: 2 },
    { capabilityName: "Quality Management", capabilityDescription: "Ability to define quality standards and systematically monitor and improve quality.", domainType: "operations", requiredLevel: "defined", businessCriticality: "high", priority: 3 },
    { capabilityName: "Supply Chain Management", capabilityDescription: "Ability to manage supplier relationships, procurement, and logistics.", domainType: "operations", requiredLevel: "basic", businessCriticality: "medium", priority: 4 },
    { capabilityName: "Operational Technology Platform", capabilityDescription: "Technology systems that support and automate core operational processes.", domainType: "technology", requiredLevel: "defined", businessCriticality: "high", priority: 5 },
  ],
  customer_program: [
    { capabilityName: "Customer Experience Design", capabilityDescription: "Ability to design end-to-end customer experiences that drive satisfaction and loyalty.", domainType: "customer", requiredLevel: "managed", businessCriticality: "critical", priority: 1 },
    { capabilityName: "Customer Data & Insights", capabilityDescription: "Ability to collect, analyse, and act on customer behavioural and feedback data.", domainType: "knowledge", requiredLevel: "defined", businessCriticality: "high", priority: 2 },
    { capabilityName: "Customer Support Operations", capabilityDescription: "Ability to deliver responsive, high-quality support across customer-preferred channels.", domainType: "customer", requiredLevel: "defined", businessCriticality: "high", priority: 3 },
    { capabilityName: "CRM Platform", capabilityDescription: "Technology platform to manage customer relationships, interactions, and lifecycle stages.", domainType: "technology", requiredLevel: "defined", businessCriticality: "high", priority: 4 },
    { capabilityName: "Loyalty & Retention Capability", capabilityDescription: "Programmes and processes to retain existing customers and increase lifetime value.", domainType: "marketing", requiredLevel: "basic", businessCriticality: "medium", priority: 5 },
  ],
  innovation_program: [
    { capabilityName: "Innovation Process & Pipeline", capabilityDescription: "Defined and repeatable process for generating, validating, and scaling innovations.", domainType: "knowledge", requiredLevel: "defined", businessCriticality: "high", priority: 1 },
    { capabilityName: "R&D Capability", capabilityDescription: "Ability to conduct structured research and development activities.", domainType: "knowledge", requiredLevel: "basic", businessCriticality: "medium", priority: 2 },
    { capabilityName: "Prototype & Experimentation", capabilityDescription: "Ability to rapidly prototype, test, and iterate on new ideas at low cost.", domainType: "technology", requiredLevel: "defined", businessCriticality: "high", priority: 3 },
    { capabilityName: "AI/ML Capability", capabilityDescription: "Ability to apply AI and machine learning to drive product and process innovation.", domainType: "ai", requiredLevel: "basic", businessCriticality: "medium", priority: 4 },
    { capabilityName: "Intellectual Property Management", capabilityDescription: "Ability to identify, protect, and leverage intellectual property assets.", domainType: "governance", requiredLevel: "basic", businessCriticality: "medium", priority: 5 },
  ],
  technology_program: [
    { capabilityName: "Core Technology Architecture", capabilityDescription: "Defined and scalable technology architecture that supports all business capabilities.", domainType: "technology", requiredLevel: "managed", businessCriticality: "critical", priority: 1 },
    { capabilityName: "Cloud & Infrastructure Management", capabilityDescription: "Ability to provision, manage, and optimise cloud and on-premise infrastructure.", domainType: "infrastructure", requiredLevel: "defined", businessCriticality: "high", priority: 2 },
    { capabilityName: "Data Platform & Analytics", capabilityDescription: "Centralised data platform with analytics capabilities for business intelligence.", domainType: "technology", requiredLevel: "defined", businessCriticality: "high", priority: 3 },
    { capabilityName: "DevOps & Engineering Practices", capabilityDescription: "Mature engineering practices including CI/CD, testing, and deployment automation.", domainType: "automation", requiredLevel: "defined", businessCriticality: "high", priority: 4 },
    { capabilityName: "Cybersecurity Programme", capabilityDescription: "Comprehensive programme to protect technology assets from internal and external threats.", domainType: "security", requiredLevel: "managed", businessCriticality: "critical", priority: 5 },
    { capabilityName: "Integration Architecture", capabilityDescription: "Ability to integrate internal and external systems through defined APIs and integration patterns.", domainType: "integrations", requiredLevel: "defined", businessCriticality: "high", priority: 6 },
  ],
  market_program: [
    { capabilityName: "Market Research & Intelligence", capabilityDescription: "Systematic capability to gather, analyse, and act on market intelligence.", domainType: "knowledge", requiredLevel: "defined", businessCriticality: "high", priority: 1 },
    { capabilityName: "Go-to-Market Execution", capabilityDescription: "Ability to design and execute go-to-market strategies for new markets and segments.", domainType: "marketing", requiredLevel: "managed", businessCriticality: "critical", priority: 2 },
    { capabilityName: "Local Market Capability", capabilityDescription: "Ability to operate effectively in new geographic or segment markets.", domainType: "operations", requiredLevel: "basic", businessCriticality: "high", priority: 3 },
    { capabilityName: "Partner & Channel Management", capabilityDescription: "Ability to identify, engage, and manage channel partners and strategic alliances.", domainType: "sales", requiredLevel: "basic", businessCriticality: "medium", priority: 4 },
    { capabilityName: "Regulatory & Compliance Navigation", capabilityDescription: "Ability to understand and comply with market-specific regulatory requirements.", domainType: "compliance", requiredLevel: "defined", businessCriticality: "high", priority: 5 },
  ],
  talent_program: [
    { capabilityName: "Talent Acquisition & Sourcing", capabilityDescription: "Ability to identify, attract, and hire the right talent at the required pace.", domainType: "people", requiredLevel: "managed", businessCriticality: "critical", priority: 1 },
    { capabilityName: "Performance Management System", capabilityDescription: "Defined system for setting, measuring, and improving individual and team performance.", domainType: "people", requiredLevel: "defined", businessCriticality: "high", priority: 2 },
    { capabilityName: "Learning & Development Programme", capabilityDescription: "Systematic programme to build the capabilities required for strategic delivery.", domainType: "people", requiredLevel: "defined", businessCriticality: "high", priority: 3 },
    { capabilityName: "Leadership Development", capabilityDescription: "Programme to identify and develop the next generation of leaders.", domainType: "leadership", requiredLevel: "defined", businessCriticality: "high", priority: 4 },
    { capabilityName: "Employee Experience Platform", capabilityDescription: "Technology and process systems that support employee engagement and productivity.", domainType: "people", requiredLevel: "basic", businessCriticality: "medium", priority: 5 },
  ],
  finance_program: [
    { capabilityName: "Financial Planning & Analysis", capabilityDescription: "Ability to forecast, model, and optimise financial performance across business units.", domainType: "finance", requiredLevel: "managed", businessCriticality: "critical", priority: 1 },
    { capabilityName: "Capital Allocation Framework", capabilityDescription: "Defined framework for prioritising and allocating capital across strategic investments.", domainType: "finance", requiredLevel: "defined", businessCriticality: "critical", priority: 2 },
    { capabilityName: "Financial Controls & Reporting", capabilityDescription: "Controls and reporting capabilities that ensure financial accuracy and regulatory compliance.", domainType: "compliance", requiredLevel: "managed", businessCriticality: "critical", priority: 3 },
    { capabilityName: "Treasury & Cash Management", capabilityDescription: "Ability to manage liquidity, working capital, and financial risk.", domainType: "finance", requiredLevel: "defined", businessCriticality: "high", priority: 4 },
    { capabilityName: "Finance Systems Platform", capabilityDescription: "Technology systems supporting financial operations, reporting, and analytics.", domainType: "technology", requiredLevel: "defined", businessCriticality: "high", priority: 5 },
  ],
  governance_program: [
    { capabilityName: "Corporate Governance Framework", capabilityDescription: "Defined governance structure with clear accountabilities, decision rights, and oversight.", domainType: "governance", requiredLevel: "managed", businessCriticality: "critical", priority: 1 },
    { capabilityName: "Risk Management Programme", capabilityDescription: "Systematic programme to identify, assess, and manage risks across the organisation.", domainType: "governance", requiredLevel: "managed", businessCriticality: "critical", priority: 2 },
    { capabilityName: "Policy & Compliance Management", capabilityDescription: "Ability to create, maintain, and enforce policies and ensure regulatory compliance.", domainType: "compliance", requiredLevel: "defined", businessCriticality: "high", priority: 3 },
    { capabilityName: "Audit & Assurance Capability", capabilityDescription: "Internal audit capability to provide independent assurance of controls and processes.", domainType: "governance", requiredLevel: "defined", businessCriticality: "high", priority: 4 },
    { capabilityName: "Security & Privacy Governance", capabilityDescription: "Governance structures for information security and data privacy.", domainType: "security", requiredLevel: "managed", businessCriticality: "critical", priority: 5 },
  ],
};

export function identifyCapabilities(programType: string): RequiredCapabilitySpec[] {
  return PROGRAM_CAPABILITIES[programType] ?? PROGRAM_CAPABILITIES.operations_program;
}

export function identifyCapabilitiesForPrograms(programs: { id: string; programType: string }[]): Map<string, RequiredCapabilitySpec[]> {
  const result = new Map<string, RequiredCapabilitySpec[]>();
  for (const prog of programs) {
    result.set(prog.id, identifyCapabilities(prog.programType));
  }
  return result;
}
