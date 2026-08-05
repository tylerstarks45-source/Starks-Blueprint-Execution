// Build 057 — Unified External Capability & Integration Operating System (UECIOS)

export interface UECIOSSummary {
  // Provider catalog
  totalProviders:     number;
  activeProviders:    number;
  connectedProviders: number;
  existingConnectors: number; // pre-existing connector implementations

  // Health
  healthyProviders:   number;
  degradedProviders:  number;
  expiredCredentials: number;
  pendingSync:        number;

  // Capabilities
  totalCapabilities:  number;
  activeConnections:  number;

  // Governance (admin-only details)
  openRecommendations:  number;
  criticalDiagnostics:  number;
  integrationReadiness: number; // 0-100

  // Domain coverage
  coveredDomains:    number;
  missingDomains:    string[]; // domains with no registered provider

  computedAt: string;
}
