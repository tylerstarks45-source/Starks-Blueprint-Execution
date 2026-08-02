// ── Build 048: Capability Engine ──────────────────────────────────────────────
// Declares and queries what each canonical asset can do.
import { db } from "@workspace/db";
import { assetCapabilities, assetRegistry } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

// ── Default capabilities per class ───────────────────────────────────────────
const CLASS_DEFAULT_CAPABILITIES: Record<string, Array<{ id: string; name: string; category: string; description: string }>> = {
  website:           [{ id: "can_display_content",    name: "Display Content",    category: "content",     description: "Display pages and content to visitors" },
                      { id: "can_collect_leads",       name: "Collect Leads",      category: "ecommerce",   description: "Capture visitor contact information" }],
  ai_agent:          [{ id: "can_process_nlp",         name: "Process Language",   category: "ai",          description: "Understand and generate natural language" },
                      { id: "can_run_autonomously",    name: "Run Autonomously",   category: "automation",  description: "Execute tasks without human intervention" }],
  automation:        [{ id: "can_trigger_on_event",    name: "Trigger on Event",   category: "automation",  description: "Execute automatically when a condition is met" },
                      { id: "can_transform_data",      name: "Transform Data",     category: "data",        description: "Read, transform, and write data" }],
  workflow:          [{ id: "can_orchestrate_steps",   name: "Orchestrate Steps",  category: "automation",  description: "Coordinate a multi-step process" }],
  database:          [{ id: "can_store_data",          name: "Store Data",         category: "data",        description: "Persist structured data" },
                      { id: "can_query_data",          name: "Query Data",         category: "data",        description: "Retrieve data via queries" }],
  api:               [{ id: "can_expose_endpoints",    name: "Expose Endpoints",   category: "integration", description: "Expose HTTP endpoints for external access" }],
  integration:       [{ id: "can_sync_external",       name: "Sync External",      category: "integration", description: "Synchronize with external platforms" }],
  campaign:          [{ id: "can_reach_audience",      name: "Reach Audience",     category: "communication", description: "Send messages to a target audience" }],
  product:           [{ id: "can_be_purchased",        name: "Can Be Purchased",   category: "ecommerce",   description: "Available for sale to customers" }],
  offer:             [{ id: "can_convert_leads",       name: "Convert Leads",      category: "ecommerce",   description: "Convert prospects into paying customers" },
                      { id: "can_generate_revenue",    name: "Generate Revenue",   category: "revenue",     description: "Directly generates revenue when fulfilled" }],
  revenue_stream:    [{ id: "can_generate_revenue",    name: "Generate Revenue",   category: "revenue",     description: "Produces repeating or one-time revenue" }],
  marketing_funnel:  [{ id: "can_capture_leads",       name: "Capture Leads",      category: "ecommerce",   description: "Guide prospects from awareness to conversion" },
                      { id: "can_generate_revenue",    name: "Generate Revenue",   category: "revenue",     description: "Converts prospects into paying customers" }],
  analytics_dashboard: [{ id: "can_visualize_data",   name: "Visualize Data",     category: "analytics",   description: "Render charts, tables, and KPI cards" },
                        { id: "can_export_reports",    name: "Export Reports",     category: "analytics",   description: "Export data to PDF, CSV, or other formats" }],
  knowledge_base:    [{ id: "can_answer_questions",   name: "Answer Questions",    category: "ai",          description: "Provide answers from stored knowledge" }],
};

export async function declareDefaultCapabilities(
  assetId: number,
  userId:  number,
  classKey: string,
): Promise<void> {
  const defaults = CLASS_DEFAULT_CAPABILITIES[classKey] ?? [];
  if (defaults.length === 0) return;

  await db.insert(assetCapabilities).values(
    defaults.map((cap) => ({
      assetId,
      userId,
      capabilityId:   cap.id,
      capabilityName: cap.name,
      category:       cap.category,
      description:    cap.description,
      isEnabled:      true,
      parameters:     {},
      declaredBy:     "system",
    })),
  ).onConflictDoNothing();
}

export async function addCapability(params: {
  assetId:        number;
  userId:         number;
  capabilityId:   string;
  capabilityName: string;
  category:       string;
  description:    string;
  parameters?:    Record<string, unknown>;
  declaredBy?:    string;
}): Promise<number> {
  const result = await db
    .insert(assetCapabilities)
    .values({
      assetId:        params.assetId,
      userId:         params.userId,
      capabilityId:   params.capabilityId,
      capabilityName: params.capabilityName,
      category:       params.category,
      description:    params.description,
      isEnabled:      true,
      parameters:     params.parameters ?? {},
      declaredBy:     params.declaredBy ?? "user",
    })
    .returning({ id: assetCapabilities.id });

  const capId = (result as any[])[0]?.id as number;

  // Update registry count
  await db
    .update(assetRegistry)
    .set({
      capabilityCount: sql`${assetRegistry.capabilityCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(assetRegistry.assetId, params.assetId));

  return capId;
}

export async function listCapabilities(assetId: number) {
  return db
    .select()
    .from(assetCapabilities)
    .where(and(eq(assetCapabilities.assetId, assetId), eq(assetCapabilities.isEnabled, true)));
}

export async function listCapabilitiesForUser(userId: number) {
  return db.select().from(assetCapabilities).where(eq(assetCapabilities.userId, userId));
}

export async function countRevenueCapabilities(userId: number): Promise<number> {
  const rows = await db
    .select({ cnt: sql<string>`count(*)` })
    .from(assetCapabilities)
    .where(and(eq(assetCapabilities.userId, userId), eq(assetCapabilities.category, "revenue"), eq(assetCapabilities.isEnabled, true)));
  return Number(rows[0]?.cnt ?? 0);
}
