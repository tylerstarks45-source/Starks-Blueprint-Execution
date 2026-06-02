import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq } from "drizzle-orm";
import { db, userCredentialsTable } from "@workspace/db";
import {
  ListUserCredentialsResponse,
  StoreUserCredentialBody,
  DeleteUserCredentialParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/user-credentials", async (req, res): Promise<void> => {
  if (!req.query.userId) {
    res.status(400).json({ error: "userId query parameter is required" });
    return;
  }
  const rows = await db
    .select({
      id: userCredentialsTable.id,
      userId: userCredentialsTable.userId,
      toolId: userCredentialsTable.toolId,
      credentialKey: userCredentialsTable.credentialKey,
      createdAt: userCredentialsTable.createdAt,
      updatedAt: userCredentialsTable.updatedAt,
    })
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.userId, Number(req.query.userId)))
    .orderBy(userCredentialsTable.credentialKey);
  res.json(ListUserCredentialsResponse.parse(serialize(rows)));
});

router.post("/user-credentials", async (req, res): Promise<void> => {
  const parsed = StoreUserCredentialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(userCredentialsTable).values(parsed.data).returning({
    id: userCredentialsTable.id,
    userId: userCredentialsTable.userId,
    toolId: userCredentialsTable.toolId,
    credentialKey: userCredentialsTable.credentialKey,
    createdAt: userCredentialsTable.createdAt,
    updatedAt: userCredentialsTable.updatedAt,
  });
  res.status(201).json(ListUserCredentialsResponse.element.parse(row));
});

router.delete("/user-credentials/:id", async (req, res): Promise<void> => {
  const params = DeleteUserCredentialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(userCredentialsTable).where(eq(userCredentialsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
