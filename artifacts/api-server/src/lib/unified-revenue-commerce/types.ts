// Build 056 — Unified Revenue, Commerce & Monetization Platform (URCMP)
// Types for Executive Brain integration

export interface URCMPSummary {
  // Catalog metrics
  totalCatalogs:      number;
  totalProducts:      number;
  totalServices:      number;
  totalOffers:        number;
  totalBundles:       number;
  totalVariants:      number;
  totalPricingModels: number;

  // Transaction documents
  totalSubscriptions:  number;
  activeSubscriptions: number;
  totalContracts:      number;
  totalQuotes:         number;
  totalProposals:      number;
  totalInvoices:       number;

  // Revenue intelligence
  totalRevenueStreams:      number;
  estimatedMonthlyRevenue:  number;
  monetizationScore:        number;   // 0-100
  catalogHealthScore:       number;   // 0-100
  pricingCompletenessScore: number;   // 0-100
  checkoutReadinessScore:   number;   // 0-100

  // Governance
  openDiagnostics:      number;
  criticalDiagnostics:  number;
  missingMonetization:  string[];
  openOpportunities:    string[];

  computedAt: string;
}
