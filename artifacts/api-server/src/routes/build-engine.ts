import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq } from "drizzle-orm";
import {
  db,
  systemInstancesTable,
  blueprintsTable,
  toolsTable,
  toolCategoriesTable,
  buildSessionsTable,
  buildProgressTable,
} from "@workspace/db";
import { complete } from "../lib/openrouter";
import { hasCredits } from "../lib/credits";
import { requireAuthActive } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

// Returns true if the caller owns the instance (or it has no owner). Sends 403 otherwise.
const ensureOwner = (
  instance: { userId: number | null },
  userId: number,
  res: import("express").Response,
): boolean => {
  if (instance.userId != null && instance.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
};

// POST /api/build-engine/analyze
router.post("/build-engine/analyze", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({ systemInstanceId: z.number().int() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [instance] = await db.select().from(systemInstancesTable).where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));
  if (!instance) { res.status(404).json({ error: "System instance not found" }); return; }
  if (!ensureOwner(instance, userId, res)) return;

  const [blueprint] = await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, instance.blueprintId));
  if (!blueprint) { res.status(404).json({ error: "Blueprint not found" }); return; }

  if (instance.userId != null && !(await hasCredits(instance.userId))) {
    res.status(402).json({ error: "You're out of AI credits. Top up to continue building.", code: "out_of_credits" });
    return;
  }

  const allCategories = await db.select().from(toolCategoriesTable);
  const allTools = await db.select().from(toolsTable).where(eq(toolsTable.activeStatus, true));
  const categoryList = allCategories.map((c) => `ID:${c.id} NAME:${c.name}`).join("\n");

  let selectedCategoryIds: number[] = [];
  let buildPlan: string[] = [];

  try {
    const analysisResult = await complete({
      systemPrompt: `You are SBEP's AI architect. Analyze a blueprint and return JSON only.
Available tool categories:
${categoryList}

Return ONLY this JSON format, nothing else:
{"categoryIds":[1,3],"buildPlan":["Step 1: ...","Step 2: ...","Step 3: ...","Step 4: ...","Step 5: ..."]}`,
      prompt: `Blueprint: ${blueprint.name}\nDescription: ${blueprint.description || ""}\nDifficulty: ${blueprint.difficulty}`,
      model: "openai/gpt-4o-mini",
      userId: instance.userId ?? undefined,
      systemInstanceId: instance.id,
    });

    const jsonMatch = analysisResult.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      selectedCategoryIds = Array.isArray(data.categoryIds) ? data.categoryIds.map(Number).filter(Boolean) : [];
      buildPlan = Array.isArray(data.buildPlan) ? data.buildPlan : [];
    }
  } catch {
    selectedCategoryIds = allCategories.slice(0, 3).map((c) => c.id);
  }

  if (buildPlan.length === 0) {
    buildPlan = [
      `Set up ${blueprint.name} core infrastructure and accounts`,
      "Configure tool integrations and API connections",
      "Build automation workflows and triggers",
      "Test all components end to end",
      "Launch and activate the live system",
    ];
  }

  const requiredTools = selectedCategoryIds.length > 0
    ? allTools.filter((t) => t.categoryId !== null && selectedCategoryIds.includes(t.categoryId!))
    : allTools.filter((t) => t.affiliateLink).slice(0, 6);

  const categoryMap = Object.fromEntries(allCategories.map((c) => [c.id, c.name]));
  const toolsWithCategory = requiredTools.map((t) => ({
    ...t,
    categoryName: t.categoryId ? (categoryMap[t.categoryId] || "General") : "General",
  }));

  res.json({
    blueprint: serialize(blueprint),
    instance: serialize(instance),
    requiredTools: serialize(toolsWithCategory),
    buildPlan,
  });
});

// POST /api/build-engine/start
router.post("/build-engine/start", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    systemInstanceId: z.number().int(),
    buildPlan: z.array(z.string()),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [instance] = await db.select().from(systemInstancesTable).where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));
  if (!instance) { res.status(404).json({ error: "System instance not found" }); return; }
  if (!ensureOwner(instance, userId, res)) return;

  // Create build session
  const [session] = await db.insert(buildSessionsTable).values({
    systemInstanceId: parsed.data.systemInstanceId,
    status: "active",
    currentStepNumber: 1,
  }).returning();

  // Create progress rows — one per step
  const steps = await Promise.all(
    parsed.data.buildPlan.map((stepText, idx) =>
      db.insert(buildProgressTable).values({
        buildSessionId: session.id,
        stepNumber: idx + 1,
        status: idx === 0 ? "in_progress" : "pending",
        notes: stepText,
      }).returning().then(([row]) => row)
    )
  );

  // Update system to building
  await db.update(systemInstancesTable)
    .set({ buildStatus: "building" })
    .where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));

  res.status(201).json({ session: serialize(session), steps: serialize(steps) });
});

// POST /api/build-engine/execute-step
router.post("/build-engine/execute-step", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    stepId: z.number().int(),
    stepDescription: z.string(),
    blueprintName: z.string(),
    stepNumber: z.number().int(),
    totalSteps: z.number().int(),
    systemInstanceId: z.number().int(),
    sessionId: z.number().int(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [instance] = await db.select().from(systemInstancesTable).where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));
  if (!instance) { res.status(404).json({ error: "System instance not found" }); return; }
  if (!ensureOwner(instance, userId, res)) return;

  if (instance.userId != null && !(await hasCredits(instance.userId))) {
    res.status(402).json({ error: "You're out of AI credits. Top up to continue building.", code: "out_of_credits" });
    return;
  }

  let output = "";
  try {
    const result = await complete({
      systemPrompt: `You are SBEP's AI Build Agent. Briefly describe what you're doing for this step in 2-3 sentences. Be technical but clear.`,
      prompt: `Blueprint: ${parsed.data.blueprintName}\nStep ${parsed.data.stepNumber}/${parsed.data.totalSteps}: ${parsed.data.stepDescription}\nDescribe what you're executing now.`,
      model: "openai/gpt-4o-mini",
      userId: instance.userId ?? undefined,
      systemInstanceId: instance.id,
    });
    output = result.content;
  } catch {
    output = `Executing: ${parsed.data.stepDescription}`;
  }

  // Mark step complete
  const [updated] = await db.update(buildProgressTable)
    .set({ status: "completed", notes: output, completedAt: new Date() })
    .where(eq(buildProgressTable.id, parsed.data.stepId))
    .returning();

  // Advance session step counter
  await db.update(buildSessionsTable)
    .set({ currentStepNumber: parsed.data.stepNumber + 1 })
    .where(eq(buildSessionsTable.id, parsed.data.sessionId));

  // Mark next pending step as in_progress
  const allSteps = await db.select().from(buildProgressTable)
    .where(eq(buildProgressTable.buildSessionId, parsed.data.sessionId));

  const nextStep = allSteps.filter((s) => s.status === "pending").sort((a, b) => a.stepNumber - b.stepNumber)[0];
  if (nextStep) {
    await db.update(buildProgressTable).set({ status: "in_progress" }).where(eq(buildProgressTable.id, nextStep.id));
  } else {
    // All done
    await db.update(systemInstancesTable)
      .set({ buildStatus: "active", healthStatus: "healthy" })
      .where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));
    await db.update(buildSessionsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(buildSessionsTable.id, parsed.data.sessionId));
  }

  res.json({ step: serialize(updated), nextStepId: nextStep?.id ?? null, output });
});

// GET /api/build-engine/:systemInstanceId/status
router.get("/build-engine/:systemInstanceId/status", async (req, res): Promise<void> => {
  const id = Number(req.params.systemInstanceId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [instance] = await db.select().from(systemInstancesTable).where(eq(systemInstancesTable.id, id));
  if (!instance) { res.status(404).json({ error: "Not found" }); return; }

  const sessions = await db.select().from(buildSessionsTable).where(eq(buildSessionsTable.systemInstanceId, id));
  const latestSession = sessions.sort((a, b) => b.id - a.id)[0] ?? null;

  let steps: typeof buildProgressTable.$inferSelect[] = [];
  if (latestSession) {
    steps = await db.select().from(buildProgressTable)
      .where(eq(buildProgressTable.buildSessionId, latestSession.id));
  }

  res.json({
    instance: serialize(instance),
    session: latestSession ? serialize(latestSession) : null,
    steps: serialize(steps.sort((a, b) => a.stepNumber - b.stepNumber)),
  });
});

export default router;
