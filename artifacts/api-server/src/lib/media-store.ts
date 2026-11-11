// Durable storage for generated media bytes, served at /api/media/blob/:token.
import { randomBytes } from "node:crypto";
import { db, mediaBlobsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export const SERVABLE_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "audio/mpeg"]);

// Social publishers fetch these URLs, so prefer an absolute base: APP_URL, then the
// first domain Replit assigns the deployment. Relative only when neither is set (local/CI).
function publicBaseUrl(): string {
  const appUrl = process.env["APP_URL"]?.trim();
  if (appUrl) return appUrl.replace(/\/+$/, "");
  const replitDomain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
  return replitDomain ? `https://${replitDomain}` : "";
}

export function mediaUrlFor(token: string): string {
  return `${publicBaseUrl()}/api/media/blob/${token}`;
}

export async function storeMedia(userId: number, data: Buffer, mimeType: string): Promise<string> {
  if (!SERVABLE_MEDIA_TYPES.has(mimeType)) throw new Error(`Unsupported media type ${mimeType}`);
  const token = randomBytes(16).toString("hex");
  await db.insert(mediaBlobsTable).values({ token, userId, mimeType, byteSize: data.length, data });
  return mediaUrlFor(token);
}

const BLOB_URL_RE = /\/api\/media\/blob\/([0-9a-f]{32})$/;

/** Removes the stored bytes behind a generated file's content URL, if it points at one the file's owner stored. */
export async function deleteMediaForContent(content: string, ownerId: number): Promise<void> {
  const token = BLOB_URL_RE.exec(content)?.[1];
  // Owner check: file content is user-editable, so it may hold another account's blob URL.
  if (token) await db.delete(mediaBlobsTable).where(and(eq(mediaBlobsTable.token, token), eq(mediaBlobsTable.userId, ownerId)));
}
