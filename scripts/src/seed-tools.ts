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

  // 2. Clear out stale tools + affiliate links (no FK dependents exist pre-launch)
  await db.delete(affiliateLinksTable);
  await db.delete(toolsTable);
  console.log("  cleared existing tools + affiliate_links");

  // 3. Insert every tool from the canonical config with its real affiliate link
  const entries = Object.values(toolAffiliateLinks) as Array<{
    name: string;
    category: string;
    cta_link?: string;
    affiliate_link?: string;
    description?: string;
  }>;

  let toolCount = 0;
  let linkCount = 0;

  for (const tool of entries) {
    const link = tool.affiliate_link || tool.cta_link || "";
    const categoryId = catByName.get(tool.category) ?? catByName.get("AI Tools")!;

    const [inserted] = await db
      .insert(toolsTable)
      .values({
        categoryId,
        name: tool.name,
        description: tool.description ?? null,
        affiliateLink: link || null,
        signupUrl: link || null,
        activeStatus: true,
      })
      .returning();
    toolCount++;

    if (link) {
      await db.insert(affiliateLinksTable).values({
        toolId: inserted.id,
        url: link,
        campaign: extractCampaign(link),
        active: true,
      });
      linkCount++;
    }
  }

  console.log(`Done. Inserted ${toolCount} tools and ${linkCount} affiliate links across ${catByName.size} categories.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
