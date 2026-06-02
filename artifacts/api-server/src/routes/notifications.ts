import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import {
  ListNotificationsResponse,
  MarkNotificationReadResponse,
  CreateNotificationBody,
  MarkNotificationReadParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  const conditions = [];
  if (req.query.userId) conditions.push(eq(notificationsTable.userId, Number(req.query.userId)));
  if (req.query.unreadOnly === "true") conditions.push(eq(notificationsTable.read, false));

  const rows = conditions.length
    ? await db.select().from(notificationsTable).where(and(...conditions)).orderBy(notificationsTable.createdAt)
    : await db.select().from(notificationsTable).orderBy(notificationsTable.createdAt);

  res.json(ListNotificationsResponse.parse(serialize(rows)));
});

router.post("/notifications", async (req, res): Promise<void> => {
  const parsed = CreateNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(notificationsTable).values(parsed.data).returning();
  res.status(201).json(ListNotificationsResponse.element.parse(row));
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json(MarkNotificationReadResponse.parse(serialize(row)));
});

export default router;
