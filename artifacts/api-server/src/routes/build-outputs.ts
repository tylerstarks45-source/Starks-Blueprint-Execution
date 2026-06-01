import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, buildOutputsTable } from "@workspace/db";
import {
  ListBuildOutputsResponse,
  CreateBuildOutputBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/build-outputs", async (req, res): Promise<void> => {
  const rows = req.query.buildSessionId
    ? await db.select().from(buildOutputsTable).where(eq(buildOutputsTable.buildSessionId, Number(req.query.buildSessionId))).orderBy(buildOutputsTable.createdAt)
    : await db.select().from(buildOutputsTable).orderBy(buildOutputsTable.createdAt);
  res.json(ListBuildOutputsResponse.parse(rows));
});

router.post("/build-outputs", async (req, res): Promise<void> => {
  const parsed = CreateBuildOutputBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(buildOutputsTable).values(parsed.data).returning();
  res.status(201).json(ListBuildOutputsResponse.element.parse(row));
});

export default router;
