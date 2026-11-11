import { eq } from "drizzle-orm";
import { db, toolsTable, toolCategoriesTable, affiliateLinksTable } from "@workspace/db";
import { toolAffiliateLinks } from "../../artifacts/web/src/config/toolAffiliateLinks.js";

const CATEGORY_NAMES = [
  "Content Creation",
  "Automation",
  "Funnels / Marketing",
  "SEO / Traffic",
  "AI Tools",
  "Business Systems",
] as const;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Content Creation": "AI video, content, and creative generation tools",
  Automation: "Workflow automation and no-code integration platforms",
  "Funnels / Marketing": "Sales funnels, email marketing, and ad platforms",
  "SEO / Traffic": "Search optimization, traffic, and conversion tools",
  "AI Tools": "AI assistants, agents, and intelligence platforms",
  "Business Systems": "End-to-end business, trading, and operations systems",
};

function extractCampaign(url: string): string | null {
  const match = url.match(/(?:aff|via|ref|fpr|fp_ref|partnerKey|red|gr_pk|atp|sa)=([^&#/]+)/i);
  return match ? match[1] : null;
}

async function main() {
  console.log("Seeding tool catalog from affiliate config...");

  // 1. Upsert the 6 marketplace categories
  const existingCats = await db.select().from(toolCategoriesTable);
  const catByName = new Map(existingCats.map((c) => [c.name, c.id]));

  for (const name of CATEGORY_NAMES) {
    if (!catByName.has(name)) {
      const [row] = await db
        .insert(toolCategoriesTable)
        .values({ name, description: CATEGORY_DESCRIPTIONS[name] })
        .returning();
      catByName.set(name, row.id);
      console.log(`  + category: ${name}`);
    }
  }

  // 2. Upsert every tool from the canonical config by name. Non-destructive:
  // tools are referenced by user selections, credentials and recommendations.
  const entries = Object.values(toolAffiliateLinks) as Array<{
    name: string;
    category: string;
    cta_link?: string;
    affiliate_link?: string;
    description?: string;
  }>;

  const existingTools = await db.select({ id: toolsTable.id, name: toolsTable.name }).from(toolsTable);
  const toolIdByName = new Map(existingTools.map((t) => [t.name, t.id]));

  let toolCount = 0;
  let linkCount = 0;

  for (const tool of entries) {
    const link = tool.affiliate_link || tool.cta_link || "";
    const categoryId = catByName.get(tool.category) ?? catByName.get("AI Tools")!;
    const values = {
      categoryId,
      name: tool.name,
      description: tool.description ?? null,
      affiliateLink: link || null,
      signupUrl: link || null,
      activeStatus: true,
    };

    let toolId = toolIdByName.get(tool.name);
    if (toolId) {
      await db.update(toolsTable).set(values).where(eq(toolsTable.id, toolId));
    } else {
      const [inserted] = await db.insert(toolsTable).values(values).returning({ id: toolsTable.id });
      toolId = inserted.id;
      toolIdByName.set(tool.name, toolId);
    }
    toolCount++;

    if (link) {
      const [existingLink] = await db
        .select({ id: affiliateLinksTable.id })
        .from(affiliateLinksTable)
        .where(eq(affiliateLinksTable.toolId, toolId))
        .limit(1);
      const linkValues = { toolId, url: link, campaign: extractCampaign(link), active: true };
      if (existingLink) {
        await db.update(affiliateLinksTable).set(linkValues).where(eq(affiliateLinksTable.id, existingLink.id));
      } else {
        await db.insert(affiliateLinksTable).values(linkValues);
      }
      linkCount++;
    }
  }

  console.log(`Done. Upserted ${toolCount} tools and ${linkCount} affiliate links across ${catByName.size} categories.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
