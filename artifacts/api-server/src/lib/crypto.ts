import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Key version identifier written into every newly encrypted value.
 * Increment (v2, v3, …) each time you rotate and want to track provenance.
 * The rotation script stamps this version onto re-encrypted rows.
 */
const CURRENT_VERSION = "v1";

function getKey(): Buffer {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

function keyFromHex(hex: string): Buffer {
  if (!hex || hex.length !== 64) {
    throw new Error("Encryption key must be a 64-character hex string.");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a string in the format: gcm:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 *
 * The "v1" segment is the key-version marker. It lets the rotation script
 * (and future decrypt paths) identify which key generation produced the value.
 */
export function encrypt(plaintext: string): string {
  return encryptWithKey(plaintext, getKey());
}

/**
 * Encrypt with an explicit key buffer (used by the rotation script).
 */
export function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `gcm:${CURRENT_VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a value produced by encrypt() or encryptWithKey().
 *
 * Handles three formats (in order of modernity):
 *   gcm:v1:<iv>:<tag>:<data>   — versioned format (5 parts), uses CREDENTIAL_ENCRYPTION_KEY
 *   gcm:<iv>:<tag>:<data>      — legacy unversioned format (4 parts), uses CREDENTIAL_ENCRYPTION_KEY
 *   <base64>                   — pre-GCM plaintext base64, decoded directly
 */
export function decrypt(stored: string): string {
  return decryptWithKey(stored, getKey());
}

/**
 * Decrypt with an explicit key hex string (used by the rotation script to
 * decrypt rows that were encrypted with the *old* key).
 */
export function decryptWithKeyHex(stored: string, keyHex: string): string {
  return decryptWithKey(stored, keyFromHex(keyHex));
}

function decryptWithKey(stored: string, key: Buffer): string {
  if (!stored.startsWith("gcm:")) {
    return Buffer.from(stored, "base64").toString("utf8");
  }

  const parts = stored.split(":");

  let ivHex: string;
  let authTagHex: string;
  let dataHex: string;

  if (parts.length === 5 && parts[1]?.startsWith("v")) {
    // versioned format: gcm:v1:<iv>:<tag>:<data>
    [, , ivHex, authTagHex, dataHex] = parts as [string, string, string, string, string];
  } else if (parts.length === 4) {
    // legacy unversioned format: gcm:<iv>:<tag>:<data>
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

/**
 * Returns true if the value is in any AES-256-GCM format (versioned or legacy).
 * Useful for migration scripts to identify already-migrated records.
 */
export function isEncrypted(stored: string): boolean {
  return stored.startsWith("gcm:");
}

/**
 * Returns the key-version embedded in the stored value, or null for base64 / unknown.
 *   gcm:v1:... → "v1"
 *   gcm:<iv>:  → "v0"  (legacy unversioned, treated as v0)
 *   <base64>   → null
 */
export function getStoredVersion(stored: string): string | null {
  if (!stored.startsWith("gcm:")) return null;
  const parts = stored.split(":");
  if (parts.length === 5 && parts[1]?.startsWith("v")) return parts[1] ?? null;
  if (parts.length === 4) return "v0";
  return null;
}

/**
 * In-process override for the key rotation timestamp.
 * Set by rotateCredentialKey() so the warning clears immediately after a
 * successful rotation without requiring a process restart.
 * (Persists only for the lifetime of the current server process.)
 */
let _rotatedAtOverride: string | null = null;

/**
 * Set the in-process rotation timestamp.  Call this after a successful key
 * rotation so getKeyRotationStatus() reflects the new date immediately.
 */
export function setKeyRotatedAt(iso: string): void {
  _rotatedAtOverride = iso;
}

/**
 * Switch the active encryption key in-process.
 * Called immediately after a successful key rotation so that all subsequent
 * encrypt() / decrypt() calls use the new key without requiring a restart.
 */
export function setActiveKey(hex: string): void {
  process.env.CREDENTIAL_ENCRYPTION_KEY = hex;
}

/**
 * Returns an object describing the encryption key rotation status.
 *
 * Priority: in-process override (set after live rotation) → env var
 * CREDENTIAL_KEY_ROTATED_AT (ISO-8601 string).
 * If neither is set: daysSinceRotation is null (unknown).
 *
 * Example: CREDENTIAL_KEY_ROTATED_AT=2024-03-15T00:00:00Z
 */
export function getKeyRotationStatus(): {
  lastRotatedAt: string | null;
  daysSinceRotation: number | null;
  warningThresholdDays: number;
  needsRotation: boolean;
} {
  const raw = _rotatedAtOverride ?? process.env.CREDENTIAL_KEY_ROTATED_AT ?? null;
  const THRESHOLD = 90;

  if (!raw) {
    return {
      lastRotatedAt: null,
      daysSinceRotation: null,
      warningThresholdDays: THRESHOLD,
      needsRotation: true,
    };
  }

  const rotatedAt = new Date(raw);
  if (isNaN(rotatedAt.getTime())) {
    return {
      lastRotatedAt: raw,
      daysSinceRotation: null,
      warningThresholdDays: THRESHOLD,
      needsRotation: true,
    };
  }

  const daysSince = Math.floor((Date.now() - rotatedAt.getTime()) / 86_400_000);
  return {
    lastRotatedAt: rotatedAt.toISOString(),
    daysSinceRotation: daysSince,
    warningThresholdDays: THRESHOLD,
    needsRotation: daysSince >= THRESHOLD,
  };
}
