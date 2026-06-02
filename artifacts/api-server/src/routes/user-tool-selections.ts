import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and } from "drizzle-orm";
import { db, userToolSelectionsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

router.get("/user-tool-selections", async (req, res): Promise<void> => {
  const conditions = [];
  if (req.query.systemInstanceId) {
    conditions.push(eq(userToolSelectionsTable.systemInstanceId, Number(req.query.systemInstanceId)));
  }
  if (req.query.toolId) {
    conditions.push(eq(userToolSelectionsTable.toolId, Number(req.query.toolId)));
  }

  const rows = conditions.length
    ? await db.select().from(userToolSelectionsTable).where(and(...conditions))
    : await db.select().from(userToolSelectionsTable);

  res.json(serialize(rows));
});

router.post("/user-tool-selections", async (req, res): Promise<void> => {
  const schema = z.object({
    systemInstanceId: z.number().int(),
    toolId: z.number().int(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(userToolSelectionsTable).values(parsed.data).returning();
  res.status(201).json(serialize(row));
});

router.delete("/user-tool-selections/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(userToolSelectionsTable).where(eq(userToolSelectionsTable.id, id));
  res.sendStatus(204);
});

export default router;
