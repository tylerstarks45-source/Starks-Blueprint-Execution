// ── Build 046: Application Registry Engine ───────────────────────────────────
// Registers every application capable of running inside UPOS.
import { db }                                from "@workspace/db";
import { platformApplications, platformRegistry } from "@workspace/db/schema";
import { eq, desc }                          from "drizzle-orm";
import type { AppManifest, AppStatus, RuntimeHealth } from "./types";
import { BUILTIN_APP_IDS }                   from "./types";

// ── Built-in application manifests ───────────────────────────────────────────

const BUILTIN_MANIFESTS: AppManifest[] = [
  {
    appId:       BUILTIN_APP_IDS.WEBSITE_BUILDER,
    appName:     "Website Builder",
    appDomain:   "builder",
    version:     "1.0.0",
    description: "Visual drag-and-drop website builder with AI-assisted content generation",
    capabilities:["website.create","website.publish","website.edit","website.preview"],
    commands: [
      { commandId: "website-builder:project:create",   commandName: "Create Website",    description: "Start a new website project",   requiredPermissions: ["website.create"],  method: "POST" },
      { commandId: "website-builder:project:publish",  commandName: "Publish Website",   description: "Publish the active website",    requiredPermissions: ["website.publish"], method: "POST" },
      { commandId: "website-builder:content:generate", commandName: "Generate Content",  description: "AI-generate page content",      requiredPermissions: ["website.edit"],    method: "POST" },
    ],
    permissions:  ["website.create","website.edit","website.publish","website.preview"],
    projectTypes: ["website"],
    assetTypes:   ["image","video","font","css","html","svg"],
    manifest:     {},
  },
  {
    appId:       BUILTIN_APP_IDS.CRM,
    appName:     "CRM",
    appDomain:   "crm",
    version:     "1.0.0",
    description: "Customer relationship management with pipeline and contact tracking",
    capabilities:["crm.contacts","crm.pipeline","crm.deals","crm.analytics"],
    commands: [
      { commandId: "crm:contact:create",   commandName: "Add Contact",    description: "Create a new CRM contact",   requiredPermissions: ["crm.contacts"], method: "POST" },
      { commandId: "crm:deal:create",      commandName: "Create Deal",    description: "Open a new deal in pipeline", requiredPermissions: ["crm.deals"],    method: "POST" },
      { commandId: "crm:pipeline:view",    commandName: "View Pipeline",  description: "Open the CRM pipeline view",  requiredPermissions: ["crm.pipeline"], method: "GET"  },
    ],
    permissions:  ["crm.contacts","crm.pipeline","crm.deals","crm.analytics"],
    projectTypes: ["crm"],
    assetTypes:   ["csv","vcard"],
    manifest:     {},
  },
  {
    appId:       BUILTIN_APP_IDS.AUTOMATION,
    appName:     "Automation Builder",
    appDomain:   "automation",
    version:     "1.0.0",
    description: "Visual workflow automation builder — triggers, actions, conditions, and integrations",
    capabilities:["automation.workflows","automation.triggers","automation.actions","automation.schedule"],
    commands: [
      { commandId: "automation:workflow:create",  commandName: "Create Workflow",   description: "Build a new automation workflow", requiredPermissions: ["automation.workflows"],  method: "POST" },
      { commandId: "automation:workflow:execute", commandName: "Run Workflow",      description: "Execute a workflow immediately",  requiredPermissions: ["automation.workflows"],  method: "POST" },
      { commandId: "automation:schedule:create",  commandName: "Schedule Task",     description: "Schedule a recurring automation", requiredPermissions: ["automation.schedule"],  method: "POST" },
    ],
    permissions:  ["automation.workflows","automation.triggers","automation.actions","automation.schedule"],
    projectTypes: ["automation"],
    assetTypes:   ["json","yaml"],
    manifest:     {},
  },
  {
    appId:       BUILTIN_APP_IDS.DASHBOARD,
    appName:     "Dashboard",
    appDomain:   "analytics",
    version:     "1.0.0",
    description: "Business intelligence dashboard with real-time metrics and custom reporting",
    capabilities:["dashboard.metrics","dashboard.reports","dashboard.charts","dashboard.export"],
    commands: [
      { commandId: "dashboard:report:create", commandName: "Create Report",  description: "Build a new analytics report",   requiredPermissions: ["dashboard.reports"],  method: "POST" },
      { commandId: "dashboard:metrics:view",  commandName: "View Metrics",   description: "Open the metrics dashboard",     requiredPermissions: ["dashboard.metrics"],  method: "GET"  },
      { commandId: "dashboard:export:csv",    commandName: "Export CSV",     description: "Export dashboard data to CSV",   requiredPermissions: ["dashboard.export"],   method: "POST" },
    ],
    permissions:  ["dashboard.metrics","dashboard.reports","dashboard.charts","dashboard.export"],
    projectTypes: ["dashboard"],
    assetTypes:   ["csv","json","pdf"],
    manifest:     {},
  },
];

// ── Seed built-in applications ────────────────────────────────────────────────

export async function seedBuiltinApplications(): Promise<number> {
  let seeded = 0;
  for (const app of BUILTIN_MANIFESTS) {
    const existing = await db
      .select({ appId: platformApplications.appId })
      .from(platformApplications)
      .where(eq(platformApplications.appId, app.appId))
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(platformApplications).values({
      appId:        app.appId,
      appName:      app.appName,
      appDomain:    app.appDomain,
      version:      app.version,
      description:  app.description,
      capabilities: app.capabilities,
      commands:     app.commands,
      permissions:  app.permissions,
      projectTypes: app.projectTypes,
      assetTypes:   app.assetTypes,
      manifest:     app.manifest,
      isBuiltin:    true,
    });
    seeded++;
  }
  return seeded;
}

// ── Register an application ───────────────────────────────────────────────────

export async function registerApplication(manifest: AppManifest): Promise<typeof platformApplications.$inferSelect> {
  const existing = await db
    .select()
    .from(platformApplications)
    .where(eq(platformApplications.appId, manifest.appId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(platformApplications)
      .set({
        appName:      manifest.appName,
        version:      manifest.version,
        description:  manifest.description,
        capabilities: manifest.capabilities,
        commands:     manifest.commands,
        permissions:  manifest.permissions,
        projectTypes: manifest.projectTypes,
        assetTypes:   manifest.assetTypes,
        manifest:     manifest.manifest,
      })
      .where(eq(platformApplications.appId, manifest.appId))
      .returning();
    await syncRegistryEntry(updated);
    return updated;
  }

  const [app] = await db
    .insert(platformApplications)
    .values({ ...manifest })
    .returning();
  await syncRegistryEntry(app);
  return app;
}

// ── List / get ────────────────────────────────────────────────────────────────

export async function listApplications(status?: AppStatus): Promise<typeof platformApplications.$inferSelect[]> {
  const all = await db.select().from(platformApplications).orderBy(desc(platformApplications.registeredAt));
  if (!status) return all;
  return all.filter((a) => a.status === status);
}

export async function getApplication(appId: string): Promise<typeof platformApplications.$inferSelect | null> {
  const rows = await db
    .select()
    .from(platformApplications)
    .where(eq(platformApplications.appId, appId))
    .limit(1);
  return rows[0] ?? null;
}

// ── Health update ─────────────────────────────────────────────────────────────

export async function updateApplicationHealth(appId: string, health: RuntimeHealth): Promise<void> {
  await db
    .update(platformRegistry)
    .set({ runtimeHealth: health, lastHealthCheckAt: new Date(), updatedAt: new Date() })
    .where(eq(platformRegistry.appId, appId));
}

// ── Registry sync ─────────────────────────────────────────────────────────────

export async function syncRegistryEntry(
  app: typeof platformApplications.$inferSelect,
): Promise<void> {
  const cmds    = (app.commands    as unknown[]) ?? [];
  const caps    = (app.capabilities as unknown[]) ?? [];
  const ptypes  = (app.projectTypes as unknown[]) ?? [];

  const existing = await db
    .select({ id: platformRegistry.id })
    .from(platformRegistry)
    .where(eq(platformRegistry.appId, app.appId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(platformRegistry)
      .set({
        appName:          app.appName,
        domain:           app.appDomain,
        version:          app.version,
        status:           app.status,
        capabilityCount:  caps.length,
        commandCount:     cmds.length,
        projectTypeCount: ptypes.length,
        updatedAt:        new Date(),
      })
      .where(eq(platformRegistry.appId, app.appId));
  } else {
    await db.insert(platformRegistry).values({
      appId:            app.appId,
      appName:          app.appName,
      domain:           app.appDomain,
      version:          app.version,
      status:           app.status,
      capabilityCount:  caps.length,
      commandCount:     cmds.length,
      projectTypeCount: ptypes.length,
    });
  }
}

// ── Rebuild all registry entries ──────────────────────────────────────────────

export async function rebuildRegistry(): Promise<number> {
  const apps = await listApplications();
  for (const app of apps) {
    await syncRegistryEntry(app);
  }
  return apps.length;
}

export { BUILTIN_MANIFESTS };
