/**
 * Minimal crypto helpers shared by migration and rotation scripts.
 * Mirrors the logic in artifacts/api-server/src/lib/crypto.ts but is
 * self-contained so scripts don't depend on the api-server artifact.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const CURRENT_VERSION = "v1";

export function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = (cipher as import("crypto").CipherGCM).getAuthTag();
  return `gcm:${CURRENT_VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptWithKeyHex(stored: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");

  if (!stored.startsWith("gcm:")) {
    return Buffer.from(stored, "base64").toString("utf8");
  }

  const parts = stored.split(":");
  let ivHex: string;
  let authTagHex: string;
  let dataHex: string;

  if (parts.length === 5 && parts[1]?.startsWith("v")) {
    // versioned: gcm:v1:<iv>:<tag>:<data>
    [, , ivHex, authTagHex, dataHex] = parts as [string, string, string, string, string];
  } else if (parts.length === 4) {
    // legacy unversioned: gcm:<iv>:<tag>:<data>
    [, ivHex, authTagHex, dataHex] = parts as [string, string, string, string];
  } else {
    throw new Error(`Invalid encrypted credential format (${parts.length} segments)`);
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
