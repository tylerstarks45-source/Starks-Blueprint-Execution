// ── GTI Orchestrator ────────────────────────────────────────────────────────
// Coordinates the full technology catalog refresh pipeline.
// 8 stages: discover → classify → benchmark → compatibility → capabilities →
//           recommendations → registry upsert → snapshot.
// All stages fail-open. Never blocks the EB request path.

import { db } from "@workspace/db";
import {
  technologyCatalog,
  technologyProviders,
  technologyCapabilities,
  technologyBenchmarks,
  technologyCompatibility,
  technologyRecommendations,
  technologyRegistry,
  technologySnapshots,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import pino from "pino";
import { discoverTechnologies, discoverProviders } from "./gti-discovery-engine";
import { countByCategory } from "./gti-classification-engine";
import { assessAllCompatibility } from "./gti-compatibility-engine";
import { benchmarkAll } from "./gti-benchmark-engine";
import { generateAllRecommendations, identifyOpportunities } from "./gti-recommendation-engine";
import type {
  TechnologyEntry,
  BenchmarkScores,
  CompatibilityAssessment,
  GlobalTechnologySummary,
  TechnologyReadiness,
} from "./types";

const logger = pino({ name: "gti-orchestrator" });

// ── Capability type seeds per technology category ─────────────────────────
const CATEGORY_CAPABILITY_MAP: Record<string, Array<{ type: string; name: string; description: string; strength: number; isKey: boolean }>> = {
  ai_provider:           [{ type: "inference",     name: "Language Inference",   description: "Text generation, completion, and chat.",       strength: 0.95, isKey: true  }, { type: "reasoning",  name: "Reasoning",      description: "Multi-step logical problem solving.", strength: 0.88, isKey: false }],
  inference_provider:    [{ type: "inference",     name: "Model Routing",        description: "Multi-model routing and fallback chains.",      strength: 0.90, isKey: true  }],
  cloud_provider:        [{ type: "compute",       name: "Cloud Compute",        description: "Managed compute, storage, and networking.",     strength: 0.95, isKey: true  }, { type: "storage",    name: "Cloud Storage",  description: "Managed object and block storage.",   strength: 0.92, isKey: false }],
  developer_tool:        [{ type: "code_generation", name: "Developer Productivity", description: "IDE features, version control, CI/CD pipeline.",     strength: 0.88, isKey: true  }],
  browser_technology:    [{ type: "web_scraping",  name: "Browser Automation",   description: "Headless browser control and web scraping.",    strength: 0.92, isKey: true  }],
  operating_system:      [{ type: "compute",       name: "System Foundation",    description: "Process management and resource scheduling.",   strength: 0.95, isKey: true  }],
  database:              [{ type: "database_management","name": "Data Persistence","description": "ACID-compliant structured data storage.",   strength: 0.95, isKey: true  }],
  vector_database:       [{ type: "vector_search", name: "Semantic Search",      description: "High-dimensional vector similarity search.",    strength: 0.92, isKey: true  }],
  search_technology:     [{ type: "search",        name: "Full-Text Search",     description: "Keyword and semantic document retrieval.",      strength: 0.90, isKey: true  }],
  automation_platform:   [{ type: "orchestration", name: "Workflow Automation",  description: "Multi-step process and workflow automation.",   strength: 0.88, isKey: true  }],
  business_software:     [{ type: "crm",           name: "Business Operations",  description: "CRM, marketing, and business process support.", strength: 0.85, isKey: true  }],
  security_platform:     [{ type: "security",      name: "Identity & Access",    description: "Authentication, SSO, MFA, and authorization.", strength: 0.92, isKey: true  }],
  analytics_platform:    [{ type: "analytics",     name: "Product Analytics",    description: "Event tracking, funnels, and cohort analysis.", strength: 0.88, isKey: true  }],
  payment_provider:      [{ type: "payment",       name: "Payment Processing",   description: "Card processing, subscriptions, and invoicing.", strength: 0.95, isKey: true }],
  crm_system:            [{ type: "crm",           name: "Customer Relations",   description: "Contact management, pipeline, and sales automation.", strength: 0.90, isKey: true }],
  communication_system:  [{ type: "communication", name: "Communication",        description: "Email, SMS, voice, and messaging delivery.",   strength: 0.90, isKey: true  }],
  storage_provider:      [{ type: "storage",       name: "Object Storage",       description: "Scalable binary and file storage at cloud scale.", strength: 0.95, isKey: true }],
  execution_environment: [{ type: "compute",       name: "Runtime Execution",    description: "JavaScript/TypeScript runtime and toolchain.", strength: 0.92, isKey: true  }],
  connector_ecosystem:   [{ type: "orchestration", name: "Integration Hub",      description: "Pre-built connectors to 1000s of applications.", strength: 0.85, isKey: true }],
  platform:              [{ type: "deployment",    name: "Platform Hosting",     description: "Managed hosting, edge delivery, and deployment.", strength: 0.88, isKey: true }],
};

// ── Pipeline ───────────────────────────────────────────────────────────────
export async function runCatalogRefresh(triggeredBy: string = "manual"): Promise<void> {
  logger.info({ triggeredBy }, "GTI: catalog refresh started");

  try {
    // 1. Discover
    const technologies = discoverTechnologies();
    const providers = discoverProviders();

    // 2. Benchmark + Compatibility (pure computation — no DB yet)
    const benchmarkList = benchmarkAll(technologies);
    const compatibilityList = assessAllCompatibility(technologies);

    const benchmarkMap = new Map<string, BenchmarkScores>(benchmarkList.map(b => [b.technologyKey, b]));
    const compatMap    = new Map<string, CompatibilityAssessment>(compatibilityList.map(c => [c.technologyKey, c]));

    // 3. Persist providers
    for (const provider of providers) {
      try {
        await db.insert(technologyProviders).values({
          key:                   provider.key,
          name:                  provider.name,
          type:                  provider.type,
          website:               provider.website ?? null,
          foundedYear:           provider.foundedYear ?? null,
          headquarters:          provider.headquarters ?? null,
          vendorMaturityScore:   provider.vendorMaturityScore ?? null,
          communityAdoptionScore:provider.communityAdoptionScore ?? null,
          supportTier:           provider.supportTier ?? null,
          isPublicCompany:       provider.isPublicCompany ?? false,
        }).onConflictDoNothing();
      } catch (err) {
        logger.warn({ err, key: provider.key }, "GTI: provider insert skipped");
      }
    }

    // 4. Persist catalog entries + capabilities + benchmarks + compatibility
    for (const entry of technologies) {
      try {
        // Catalog
        await db.insert(technologyCatalog).values({
          key:              entry.key,
          name:             entry.name,
          category:         entry.category,
          subcategory:      entry.subcategory ?? null,
          vendor:           entry.vendor,
          description:      entry.description,
          website:          entry.website ?? null,
          licenseType:      entry.licenseType ?? null,
          pricingModel:     entry.pricingModel ?? null,
          maturityLevel:    entry.maturityLevel,
          openSourceUrl:    entry.openSourceUrl ?? null,
          documentationUrl: entry.documentationUrl ?? null,
          isAdminRestricted: true,
        }).onConflictDoNothing();

        // Capabilities
        const caps = CATEGORY_CAPABILITY_MAP[entry.category] ?? [];
        for (const cap of caps) {
          await db.insert(technologyCapabilities).values({
            technologyKey:  entry.key,
            capabilityType: cap.type,
            name:           cap.name,
            description:    cap.description,
            strengthScore:  cap.strength,
            isKeyCapability:cap.isKey,
          });
        }

        // Benchmarks
        const b = benchmarkMap.get(entry.key);
        if (b) {
          await db.insert(technologyBenchmarks).values({
            technologyKey:         b.technologyKey,
            performanceScore:      b.performanceScore,
            reliabilityScore:      b.reliabilityScore,
            costScore:             b.costScore,
            latencyScore:          b.latencyScore,
            scalabilityScore:      b.scalabilityScore,
            maintenanceBurdenScore:b.maintenanceBurdenScore,
            vendorMaturityScore:   b.vendorMaturityScore,
            communityAdoptionScore:b.communityAdoptionScore,
            securityPostureScore:  b.securityPostureScore,
            compositeScore:        b.compositeScore,
            benchmarkNotes:        b.benchmarkNotes ?? null,
          });
        }

        // Compatibility
        const c = compatMap.get(entry.key);
        if (c) {
          await db.insert(technologyCompatibility).values({
            technologyKey:               c.technologyKey,
            compatibilityLevel:          c.compatibilityLevel,
            compatibilityScore:          c.compatibilityScore,
            infrastructureCompatible:    c.infrastructureCompatible,
            adapterCompatible:           c.adapterCompatible,
            osCompatible:                c.osCompatible,
            executionModelCompatible:    c.executionModelCompatible,
            integrationComplexity:       c.integrationComplexity,
            blockers:                    c.blockers,
            requirements:               c.requirements,
            notes:                      c.notes ?? null,
          });
        }
      } catch (err) {
        logger.warn({ err, key: entry.key }, "GTI: technology pipeline stage failed (ignored)");
      }
    }

    // 5. Recommendations
    const recommendations = generateAllRecommendations(technologies, benchmarkMap, compatMap);
    for (const rec of recommendations) {
      try {
        await db.insert(technologyRecommendations).values({
          technologyKey:            rec.technologyKey,
          recommendationType:       rec.recommendationType,
          priority:                 rec.priority,
          title:                    rec.title,
          description:              rec.description,
          evidence:                 rec.evidence,
          businessImpact:           rec.businessImpact,
          performanceImpact:        rec.performanceImpact,
          costImpact:               rec.costImpact,
          securityImpact:           rec.securityImpact,
          compatibilityScore:       rec.compatibilityScore,
          expectedImprovement:      rec.expectedImprovement,
          implementationComplexity: rec.implementationComplexity,
          operationalRisk:          rec.operationalRisk,
          confidence:               rec.confidence,
          alternatives:             rec.alternatives,
          isAdminOnly:              true,
          isApplied:                false,
        });
      } catch (err) {
        logger.warn({ err, key: rec.technologyKey }, "GTI: recommendation insert failed (ignored)");
      }
    }

    // 6. Registry upsert
    for (const entry of technologies) {
      try {
        const b = benchmarkMap.get(entry.key);
        const c = compatMap.get(entry.key);
        const openRecs = recommendations.filter(r => r.technologyKey === entry.key).length;

        await db.insert(technologyRegistry).values({
          technologyKey:      entry.key,
          name:               entry.name,
          category:           entry.category,
          vendor:             entry.vendor,
          maturityLevel:      entry.maturityLevel,
          compositeScore:     b?.compositeScore ?? null,
          compatibilityLevel: c?.compatibilityLevel ?? null,
          compatibilityScore: c?.compatibilityScore ?? null,
          openRecommendations:openRecs,
          lastScannedAt:      new Date(),
          isAdminRestricted:  true,
        }).onConflictDoUpdate({
          target: technologyRegistry.technologyKey,
          set: {
            name:               entry.name,
            maturityLevel:      entry.maturityLevel,
            compositeScore:     b?.compositeScore ?? null,
            compatibilityLevel: c?.compatibilityLevel ?? null,
            compatibilityScore: c?.compatibilityScore ?? null,
            openRecommendations:openRecs,
            lastScannedAt:      new Date(),
          },
        });
      } catch (err) {
        logger.warn({ err, key: entry.key }, "GTI: registry upsert failed (ignored)");
      }
    }

    // 7. Snapshot
    try {
      const opportunities = identifyOpportunities(technologies, benchmarkMap, compatMap);
      const categoryCounts = countByCategory(technologies);
      const compatible   = compatibilityList.filter(c => c.compatibilityLevel === "compatible").length;
      const partial      = compatibilityList.filter(c => c.compatibilityLevel === "partial").length;
      const incompatible = compatibilityList.filter(c => c.compatibilityLevel === "incompatible").length;
      const avgComposite = benchmarkList.reduce((s, b) => s + b.compositeScore, 0) / benchmarkList.length;

      // Innovation score: % of technologies that are stable+ with composite ≥ 0.85
      const innovativeCount = benchmarkList.filter(b => b.compositeScore >= 0.85).length;
      const innovationScore = innovativeCount / Math.max(1, benchmarkList.length);

      const readiness: TechnologyReadiness =
        recommendations.length === 0 ? "ready" :
        recommendations.length <= 5   ? "expanding" :
        recommendations.length <= 15  ? "expanding" : "constrained";

      await db.insert(technologySnapshots).values({
        totalTechnologies:  technologies.length,
        totalProviders:     providers.length,
        categoryCounts,
        avgCompositeScore:  Math.round(avgComposite * 1000) / 1000,
        compatibleCount:    compatible,
        partialCount:       partial,
        incompatibleCount:  incompatible,
        openRecommendations:recommendations.length,
        topOpportunities:   opportunities.slice(0, 5).map(o => o.name),
        technologyReadiness:readiness,
        innovationScore:    Math.round(innovationScore * 1000) / 1000,
        snapshotData:       { opportunities: opportunities.slice(0, 10), timestamp: new Date().toISOString() },
      });
    } catch (err) {
      logger.warn({ err }, "GTI: snapshot insert failed (ignored)");
    }

    logger.info({ technologies: technologies.length, providers: providers.length, recommendations: recommendations.length }, "GTI: catalog refresh complete");
  } catch (err) {
    logger.error({ err }, "GTI: catalog refresh pipeline error (fail-open)");
  }
}

// ── Summary builder for EB ──────────────────────────────────────────────────
export async function buildTechnologySummary(): Promise<GlobalTechnologySummary | null> {
  try {
    const [registryRows, openRecs, latestSnapshot] = await Promise.all([
      db.select().from(technologyRegistry).limit(100),
      db.select().from(technologyRecommendations).where(eq(technologyRecommendations.isApplied, false)).limit(50),
      db.select().from(technologySnapshots).orderBy(technologySnapshots.capturedAt).limit(1),
    ]);

    if (registryRows.length === 0) return null;

    const snap = latestSnapshot[0];
    const categoryCounts: Record<string, number> = {};
    for (const row of registryRows) {
      categoryCounts[row.category] = (categoryCounts[row.category] ?? 0) + 1;
    }

    const compatible   = registryRows.filter(r => r.compatibilityLevel === "compatible").length;
    const partial      = registryRows.filter(r => r.compatibilityLevel === "partial").length;
    const incompatible = registryRows.filter(r => r.compatibilityLevel === "incompatible").length;

    const compositeVals = registryRows.map(r => r.compositeScore ?? 0);
    const avgComposite  = compositeVals.reduce((s, v) => s + v, 0) / Math.max(1, compositeVals.length);

    const topOpportunities = registryRows
      .filter(r => r.compatibilityLevel === "compatible" && (r.compositeScore ?? 0) >= 0.85 && r.openRecommendations > 0)
      .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0))
      .slice(0, 5)
      .map(r => ({
        technologyKey:          r.technologyKey,
        name:                   r.name,
        category:               r.category as import("./types").TechnologyCategory,
        opportunityDescription: `${r.name} could enhance ASH's ${r.category} capabilities.`,
        potentialImpact:        "significant" as const,
        compatibilityScore:     r.compatibilityScore ?? 0,
        compositeScore:         r.compositeScore ?? 0,
        estimatedEffort:        "medium" as import("./types").IntegrationComplexity,
      }));

    const topRecommendations = openRecs.slice(0, 5).map(r => ({
      technologyKey:            r.technologyKey,
      recommendationType:       r.recommendationType as import("./types").RecommendationType,
      priority:                 r.priority as import("./types").RecommendationPriority,
      title:                    r.title,
      description:              r.description,
      evidence:                 r.evidence,
      businessImpact:           r.businessImpact,
      performanceImpact:        r.performanceImpact,
      costImpact:               r.costImpact,
      securityImpact:           r.securityImpact,
      compatibilityScore:       r.compatibilityScore,
      expectedImprovement:      r.expectedImprovement,
      implementationComplexity: r.implementationComplexity as import("./types").IntegrationComplexity,
      operationalRisk:          r.operationalRisk,
      confidence:               r.confidence,
      alternatives:             (r.alternatives as string[]) ?? [],
    }));

    const innovationScore = snap?.innovationScore ?? (registryRows.filter(r => (r.compositeScore ?? 0) >= 0.85).length / Math.max(1, registryRows.length));

    const readiness: import("./types").TechnologyReadiness =
      openRecs.length === 0  ? "ready" :
      openRecs.length <= 10  ? "expanding" :
      openRecs.length <= 25  ? "constrained" : "limited";

    return {
      totalTechnologies:  registryRows.length,
      totalProviders:     snap?.totalProviders ?? 0,
      technologyReadiness:readiness,
      innovationScore:    Math.round(innovationScore * 1000) / 1000,
      avgCompositeScore:  Math.round(avgComposite * 1000) / 1000,
      compatibleCount:    compatible,
      partialCount:       partial,
      incompatibleCount:  incompatible,
      openRecommendations:openRecs.length,
      categoryCounts,
      topOpportunities,
      topRecommendations,
    };
  } catch {
    return null;
  }
}
