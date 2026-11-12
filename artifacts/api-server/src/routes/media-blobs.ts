// Public by design: social platforms and <img> tags fetch these without auth.
// The unguessable token is the capability.
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, mediaBlobsTable } from "@workspace/db";
import { SERVABLE_MEDIA_TYPES } from "../lib/media-store";

const router: IRouter = Router();

router.get("/media/blob/:token", async (req, res): Promise<void> => {
  const token = String(req.params["token"] ?? "");
  if (!/^[0-9a-f]{32}$/.test(token)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [blob] = await db
    .select({ mimeType: mediaBlobsTable.mimeType, data: mediaBlobsTable.data })
    .from(mediaBlobsTable)
    .where(eq(mediaBlobsTable.token, token))
    .limit(1);
  if (!blob || !SERVABLE_MEDIA_TYPES.has(blob.mimeType)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.setHeader("Content-Type", blob.mimeType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.send(blob.data);
});

export default router;
