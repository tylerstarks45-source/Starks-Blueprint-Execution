// Durable storage for generated media bytes, served at /api/media/blob/:token.
import { randomBytes } from "node:crypto";
import { db, mediaBlobsTable } from "@workspace/db";

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
