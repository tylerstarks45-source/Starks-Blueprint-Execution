import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { db, skillsTable, skillActivationsTable } from "@workspace/db";
import { requireAuthActive, getTokenPayload } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

// ─── GET /api/skills ─────────────────────────────────────────────────────────
// Public-ish: returns all active skills grouped by category.
router.get("/skills", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(skillsTable)
    .where(eq(skillsTable.activeStatus, true))
    .orderBy(skillsTable.category, skillsTable.name);
  res.json(serialize(rows));
});

// ─── GET /api/skills/analytics ───────────────────────────────────────────────
// Admin only. Returns activation counts per skill.
router.get("/skills/analytics", async (req, res): Promise<void> => {
  const caller = getTokenPayload(req);
  if (!caller || !ADMIN_ROLES.has(caller.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rows = await db
    .select({
      skillId: skillActivationsTable.skillId,
      slug: skillsTable.slug,
      name: skillsTable.name,
      category: skillsTable.category,
      icon: skillsTable.icon,
      activationCount: count(skillActivationsTable.id),
    })
    .from(skillActivationsTable)
    .innerJoin(skillsTable, eq(skillActivationsTable.skillId, skillsTable.id))
    .groupBy(skillActivationsTable.skillId, skillsTable.slug, skillsTable.name, skillsTable.category, skillsTable.icon)
    .orderBy(desc(count(skillActivationsTable.id)));

  const total = await db.select({ n: count() }).from(skillActivationsTable);
  res.json({ activations: serialize(rows), totalActivations: total[0]?.n ?? 0 });
});

// ─── POST /api/skills/activate ───────────────────────────────────────────────
// Log that a set of skills were activated for a given user/system.
router.post("/skills/activate", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    skillSlugs: z.array(z.string().min(1)).min(1),
    systemInstanceId: z.number().int().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const skills = await db
    .select({ id: skillsTable.id, slug: skillsTable.slug })
    .from(skillsTable)
    .where(eq(skillsTable.activeStatus, true));

  const slugMap = Object.fromEntries(skills.map((s) => [s.slug, s.id]));

  const toInsert = parsed.data.skillSlugs
    .filter((slug) => slugMap[slug])
    .map((slug) => ({
      skillId: slugMap[slug],
      userId,
      systemInstanceId: parsed.data.systemInstanceId ?? null,
    }));

  if (toInsert.length === 0) {
    res.status(400).json({ error: "No valid skill slugs provided" });
    return;
  }

  await Promise.all(toInsert.map((row) => db.insert(skillActivationsTable).values(row)));
  res.json({ activated: toInsert.length });
});

// ─── PATCH /api/skills/:id ───────────────────────────────────────────────────
// Admin only. Toggle active_status or update fields.
router.patch("/skills/:id", async (req, res): Promise<void> => {
  const caller = getTokenPayload(req);
  if (!caller || !ADMIN_ROLES.has(caller.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const schema = z.object({
    activeStatus: z.boolean().optional(),
    description: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db
    .update(skillsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(skillsTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Skill not found" }); return; }
  res.json(serialize(row));
});

export default router;
