// ── SDI Mapping Engine ────────────────────────────────────────────────────
// Creates deterministic system maps of all ASH platform systems.
// Pure computation — no I/O.

import type { SystemProfile, SubsystemProfile } from "./types";

export function getSystemCatalog(): SystemProfile[] {
  return [
    {
      systemKey: "business-system",
      systemName: "Business Management System",
      systemType: "business",
      description: "Manages business registration, health scoring, portfolio tracking, and business intelligence across all user businesses.",
      boundaryScope: "platform",
      componentCount: 8,
      connectionCount: 14,
      stabilityScore: 0.82,
      complexityScore: 0.71,
      healthScore: 0.79,
      maturityLevel: "established",
      criticalPath: true,
      systemNotes: "Foundation system. All intelligence engines consume business data.",
    },
    {
      systemKey: "technology-system",
      systemName: "Technology Intelligence System",
      systemType: "technology",
      description: "Tracks 54 technologies across lifecycle, trends, velocity, adoption, relationships, and evolution patterns.",
      boundaryScope: "platform",
      componentCount: 11,
      connectionCount: 22,
      stabilityScore: 0.85,
      complexityScore: 0.77,
      healthScore: 0.83,
      maturityLevel: "established",
      criticalPath: true,
      systemNotes: "Feeds global tech intelligence, relationships, and evolution to all higher-order engines.",
    },
    {
      systemKey: "execution-system",
      systemName: "Execution Orchestration System",
      systemType: "execution",
      description: "Coordinates capability planning, operational planning, authority resolution, execution orchestration, and workflow execution across all work.",
      boundaryScope: "platform",
      componentCount: 12,
      connectionCount: 28,
      stabilityScore: 0.76,
      complexityScore: 0.88,
      healthScore: 0.74,
      maturityLevel: "established",
      criticalPath: true,
      systemNotes: "Most complex system. Coordinates 7 engine layers from strategy to physical execution.",
    },
    {
      systemKey: "intelligence-system",
      systemName: "Cognitive Intelligence System",
      systemType: "intelligence",
      description: "The Executive Brain, reasoning pipeline, memory, knowledge graph, goal engine, judgment engine, and all cognitive orchestration.",
      boundaryScope: "platform",
      componentCount: 14,
      connectionCount: 31,
      stabilityScore: 0.80,
      complexityScore: 0.92,
      healthScore: 0.81,
      maturityLevel: "mature",
      criticalPath: true,
      systemNotes: "Core ASH cognitive layer. Feeds decisions to all other systems.",
    },
    {
      systemKey: "data-system",
      systemName: "Data & Knowledge System",
      systemType: "data",
      description: "PostgreSQL database, schema management, knowledge graph, research engine, ASH brain distillation, and all persistent intelligence.",
      boundaryScope: "platform",
      componentCount: 7,
      connectionCount: 18,
      stabilityScore: 0.88,
      complexityScore: 0.65,
      healthScore: 0.86,
      maturityLevel: "mature",
      criticalPath: true,
      systemNotes: "Highest stability. All other systems read from and write to this system.",
    },
    {
      systemKey: "user-system",
      systemName: "User & Authentication System",
      systemType: "user",
      description: "Authentication, session management, role-based access control, subscription management, and user preferences.",
      boundaryScope: "platform",
      componentCount: 6,
      connectionCount: 12,
      stabilityScore: 0.89,
      complexityScore: 0.55,
      healthScore: 0.87,
      maturityLevel: "mature",
      criticalPath: true,
      systemNotes: "Every other system depends on user identity and permissions.",
    },
    {
      systemKey: "infrastructure-system",
      systemName: "Platform Infrastructure System",
      systemType: "infrastructure",
      description: "Server compute, database connections, job scheduler, runtime workers, background tasks, and service health monitoring.",
      boundaryScope: "infrastructure",
      componentCount: 8,
      connectionCount: 16,
      stabilityScore: 0.84,
      complexityScore: 0.68,
      healthScore: 0.82,
      maturityLevel: "established",
      criticalPath: true,
      systemNotes: "Underpins all other systems. Runtime failures propagate immediately.",
    },
    {
      systemKey: "integration-system",
      systemName: "External Integration System",
      systemType: "integration",
      description: "Connections Hub, credential vault, social OAuth, browser agent, adapter framework, and all third-party service integrations.",
      boundaryScope: "external",
      componentCount: 9,
      connectionCount: 20,
      stabilityScore: 0.72,
      complexityScore: 0.79,
      healthScore: 0.70,
      maturityLevel: "emerging",
      criticalPath: false,
      systemNotes: "Lowest stability due to external dependency volatility. Most active development area.",
    },
  ];
}

export function getSubsystemCatalog(): SubsystemProfile[] {
  return [
    // Business System subsystems
    { parentSystemKey: "business-system", subsystemKey: "business-registry", subsystemName: "Business Registry", subsystemType: "store", role: "Canonical source of truth for all registered businesses", autonomyLevel: "passive", couplingStrength: "tight", healthScore: 0.88, stabilityScore: 0.90, isBottleneck: false, isCritical: true },
    { parentSystemKey: "business-system", subsystemKey: "business-health-engine", subsystemName: "Business Health Scoring", subsystemType: "engine", role: "Computes async health scores for all businesses", autonomyLevel: "autonomous", couplingStrength: "moderate", healthScore: 0.82, stabilityScore: 0.84, isBottleneck: false, isCritical: true },
    { parentSystemKey: "business-system", subsystemKey: "business-analysis-engine", subsystemName: "Business Analysis Engine", subsystemType: "engine", role: "Descriptive business analysis — no recommendations", autonomyLevel: "autonomous", couplingStrength: "loose", healthScore: 0.80, stabilityScore: 0.82, isBottleneck: false, isCritical: false },
    { parentSystemKey: "business-system", subsystemKey: "opportunity-discovery", subsystemName: "Opportunity Discovery Engine", subsystemType: "engine", role: "Discovers opportunities from 6 sources across all businesses", autonomyLevel: "autonomous", couplingStrength: "moderate", healthScore: 0.78, stabilityScore: 0.80, isBottleneck: false, isCritical: false },

    // Technology System subsystems
    { parentSystemKey: "technology-system", subsystemKey: "global-tech-catalog", subsystemName: "Global Technology Catalog", subsystemType: "store", role: "54-technology master catalog with provider and pricing data", autonomyLevel: "passive", couplingStrength: "tight", healthScore: 0.90, stabilityScore: 0.92, isBottleneck: false, isCritical: true },
    { parentSystemKey: "technology-system", subsystemKey: "tech-relationship-engine", subsystemName: "Technology Relationship Engine", subsystemType: "engine", role: "Maps 21 relationship types across technology ecosystem", autonomyLevel: "autonomous", couplingStrength: "moderate", healthScore: 0.85, stabilityScore: 0.86, isBottleneck: false, isCritical: false },
    { parentSystemKey: "technology-system", subsystemKey: "tech-evolution-engine", subsystemName: "Technology Evolution Engine", subsystemType: "engine", role: "Lifecycle, trend, velocity, adoption, outlook per technology", autonomyLevel: "autonomous", couplingStrength: "moderate", healthScore: 0.83, stabilityScore: 0.85, isBottleneck: false, isCritical: false },

    // Execution System subsystems
    { parentSystemKey: "execution-system", subsystemKey: "capability-planning", subsystemName: "Capability Planning Engine", subsystemType: "engine", role: "Plans required capabilities from programme types", autonomyLevel: "semi-autonomous", couplingStrength: "moderate", healthScore: 0.76, stabilityScore: 0.78, isBottleneck: false, isCritical: true },
    { parentSystemKey: "execution-system", subsystemKey: "operational-planning", subsystemName: "Operational Planning Engine", subsystemType: "engine", role: "Organises work into 5 operational phases", autonomyLevel: "semi-autonomous", couplingStrength: "moderate", healthScore: 0.75, stabilityScore: 0.77, isBottleneck: false, isCritical: true },
    { parentSystemKey: "execution-system", subsystemKey: "authority-resolution", subsystemName: "Authority Resolution Engine", subsystemType: "engine", role: "Determines who is authorized to execute each action", autonomyLevel: "autonomous", couplingStrength: "moderate", healthScore: 0.78, stabilityScore: 0.80, isBottleneck: false, isCritical: true },
    { parentSystemKey: "execution-system", subsystemKey: "risk-assessment", subsystemName: "Execution Risk Assessment Engine", subsystemType: "engine", role: "Scores risk across 6 categories before execution", autonomyLevel: "autonomous", couplingStrength: "loose", healthScore: 0.80, stabilityScore: 0.82, isBottleneck: false, isCritical: true },
    { parentSystemKey: "execution-system", subsystemKey: "runtime-worker", subsystemName: "Runtime Job Worker", subsystemType: "service", role: "Polls and executes queued AI jobs asynchronously", autonomyLevel: "autonomous", couplingStrength: "moderate", healthScore: 0.74, stabilityScore: 0.76, isBottleneck: true, isCritical: true, subsystemNotes: "Primary throughput bottleneck under high job volume." },

    // Intelligence System subsystems
    { parentSystemKey: "intelligence-system", subsystemKey: "executive-brain", subsystemName: "Executive Brain", subsystemType: "engine", role: "Top-level cognitive orchestrator; synthesizes all intelligence into context", autonomyLevel: "autonomous", couplingStrength: "tight", healthScore: 0.82, stabilityScore: 0.84, isBottleneck: false, isCritical: true },
    { parentSystemKey: "intelligence-system", subsystemKey: "reasoning-pipeline", subsystemName: "Executive Reasoning Pipeline", subsystemType: "engine", role: "6-stage deterministic reasoning from goal to success criteria", autonomyLevel: "autonomous", couplingStrength: "moderate", healthScore: 0.83, stabilityScore: 0.85, isBottleneck: false, isCritical: true },
    { parentSystemKey: "intelligence-system", subsystemKey: "ash-brain", subsystemName: "ASH Self-Improving Brain", subsystemType: "engine", role: "Distills lessons from session history into reusable knowledge", autonomyLevel: "autonomous", couplingStrength: "loose", healthScore: 0.79, stabilityScore: 0.81, isBottleneck: false, isCritical: false },

    // Data System subsystems
    { parentSystemKey: "data-system", subsystemKey: "postgresql", subsystemName: "PostgreSQL Database", subsystemType: "store", role: "Primary persistent store for all platform data", autonomyLevel: "passive", couplingStrength: "tight", healthScore: 0.92, stabilityScore: 0.94, isBottleneck: false, isCritical: true },
    { parentSystemKey: "data-system", subsystemKey: "knowledge-graph", subsystemName: "Cognitive Knowledge Graph", subsystemType: "store", role: "Typed directed-edge knowledge relationships and clusters", autonomyLevel: "passive", couplingStrength: "moderate", healthScore: 0.85, stabilityScore: 0.87, isBottleneck: false, isCritical: false },
    { parentSystemKey: "data-system", subsystemKey: "research-engine", subsystemName: "Research & Knowledge Engine", subsystemType: "engine", role: "Knowledge-first lookup; fresh gather from online providers", autonomyLevel: "semi-autonomous", couplingStrength: "loose", healthScore: 0.78, stabilityScore: 0.80, isBottleneck: false, isCritical: false },

    // User System subsystems
    { parentSystemKey: "user-system", subsystemKey: "auth-middleware", subsystemName: "Authentication Middleware", subsystemType: "layer", role: "JWT validation and session enforcement on every API route", autonomyLevel: "passive", couplingStrength: "tight", healthScore: 0.91, stabilityScore: 0.93, isBottleneck: false, isCritical: true },
    { parentSystemKey: "user-system", subsystemKey: "rbac-engine", subsystemName: "Role-Based Access Control", subsystemType: "layer", role: "Enforces role hierarchy: FOUNDER_ADMIN > admin > user", autonomyLevel: "passive", couplingStrength: "tight", healthScore: 0.90, stabilityScore: 0.92, isBottleneck: false, isCritical: true },

    // Infrastructure System subsystems
    { parentSystemKey: "infrastructure-system", subsystemKey: "scheduler", subsystemName: "Job Scheduler", subsystemType: "service", role: "Periodic background tasks: brain distillation, EB cycles, health checks", autonomyLevel: "autonomous", couplingStrength: "moderate", healthScore: 0.83, stabilityScore: 0.85, isBottleneck: false, isCritical: true },
    { parentSystemKey: "infrastructure-system", subsystemKey: "connection-pool", subsystemName: "Database Connection Pool", subsystemType: "service", role: "Manages PostgreSQL connection lifecycle and backpressure", autonomyLevel: "passive", couplingStrength: "tight", healthScore: 0.87, stabilityScore: 0.89, isBottleneck: false, isCritical: true },

    // Integration System subsystems
    { parentSystemKey: "integration-system", subsystemKey: "connections-hub", subsystemName: "Connections Hub", subsystemType: "integration", role: "Credential vault + 40+ integration catalog", autonomyLevel: "passive", couplingStrength: "moderate", healthScore: 0.73, stabilityScore: 0.75, isBottleneck: false, isCritical: false },
    { parentSystemKey: "integration-system", subsystemKey: "adapter-framework", subsystemName: "Universal Execution Adapter Framework", subsystemType: "adapter", role: "39 first-class adapter types; 5 seeded builtins", autonomyLevel: "semi-autonomous", couplingStrength: "moderate", healthScore: 0.72, stabilityScore: 0.74, isBottleneck: false, isCritical: false },
  ];
}

export function computeSystemComplexityScore(system: SystemProfile): number {
  return Math.min(
    (system.componentCount / 15) * 0.5 + (system.connectionCount / 35) * 0.5,
    1.0
  );
}

export function identifyBottleneckSystems(systems: SystemProfile[]): SystemProfile[] {
  return systems.filter(s => s.complexityScore > 0.80 || !s.criticalPath === false);
}
