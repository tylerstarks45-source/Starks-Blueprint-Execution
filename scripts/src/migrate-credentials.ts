/**
 * One-time migration: re-encrypt all user_credentials rows from base64 to AES-256-GCM.
 *
 * Run with:
 *   CREDENTIAL_ENCRYPTION_KEY=<key> pnpm --filter @workspace/scripts run migrate-credentials
 *
 * Safe to run multiple times — already-migrated rows (starting with "gcm:") are skipped.
 */
import { createCipheriv, randomBytes } from "crypto";
import { db, userCredentialsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)."
    );
  }
  return Buffer.from(hex, "hex");
}

function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = (cipher as import("crypto").CipherGCM).getAuthTag();
  return `gcm:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function isEncrypted(stored: string): boolean {
  return stored.startsWith("gcm:");
}

async function main() {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    console.error(
      "ERROR: CREDENTIAL_ENCRYPTION_KEY must be set to a 64-character hex string.\n" +
        "  Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
    process.exit(1);
  }

  const rows = await db
    .select({ id: userCredentialsTable.id, encryptedValue: userCredentialsTable.encryptedValue })
    .from(userCredentialsTable);

  console.log(`Found ${rows.length} credential row(s).`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (isEncrypted(row.encryptedValue)) {
      skipped++;
      continue;
    }
    try {
      const plaintext = Buffer.from(row.encryptedValue, "base64").toString("utf8");
      const newValue = encrypt(plaintext);
      await db
        .update(userCredentialsTable)
        .set({ encryptedValue: newValue, updatedAt: new Date() })
        .where(eq(userCredentialsTable.id, row.id));
      migrated++;
    } catch (err) {
      console.error(`  FAILED row id=${row.id}:`, err);
      failed++;
    }
  }

  console.log(
    `Done. migrated=${migrated}, skipped (already encrypted)=${skipped}, failed=${failed}`
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
