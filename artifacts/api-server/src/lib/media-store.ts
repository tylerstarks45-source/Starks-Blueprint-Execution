// Durable storage for generated media bytes, served at /api/media/blob/:token.
import { randomBytes } from "node:crypto";
import { db, mediaBlobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const SERVABLE_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "audio/mpeg"]);

/** Absolute when APP_URL is set, so social platforms can fetch it; relative otherwise. */
export function mediaUrlFor(token: string): string {
  const base = (process.env["APP_URL"] ?? "").replace(/\/+$/, "");
  return `${base}/api/media/blob/${token}`;
}

export async function storeMedia(userId: number, data: Buffer, mimeType: string): Promise<string> {
  if (!SERVABLE_MEDIA_TYPES.has(mimeType)) throw new Error(`Unsupported media type ${mimeType}`);
  const token = randomBytes(16).toString("hex");
  await db.insert(mediaBlobsTable).values({ token, userId, mimeType, byteSize: data.length, data });
  return mediaUrlFor(token);
}

const BLOB_URL_RE = /\/api\/media\/blob\/([0-9a-f]{32})$/;

/** Removes the stored bytes behind a generated file's content URL, if it points at one. */
export async function deleteMediaForContent(content: string): Promise<void> {
  const token = BLOB_URL_RE.exec(content)?.[1];
  if (token) await db.delete(mediaBlobsTable).where(eq(mediaBlobsTable.token, token));
}
