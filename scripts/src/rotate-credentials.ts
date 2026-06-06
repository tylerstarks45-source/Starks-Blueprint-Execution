/**
 * Key Rotation Script — re-encrypt all user_credentials rows from an old key to a new key.
 *
 * Usage:
 *   OLD_CREDENTIAL_ENCRYPTION_KEY=<old-64-hex> \
 *   CREDENTIAL_ENCRYPTION_KEY=<new-64-hex> \
 *   pnpm --filter @workspace/scripts run rotate-credentials
 *
 * After a successful run, set the CREDENTIAL_KEY_ROTATED_AT environment variable to the
 * current UTC date so the admin dashboard rotation-age warning resets:
 *   CREDENTIAL_KEY_ROTATED_AT=<ISO-8601 datetime>   e.g. 2025-06-06T00:00:00Z
 *
 * Safety guarantees:
 *   - All updates run inside a single DB transaction. If any row fails, the entire
 *     rotation is rolled back and no data is changed.
 *   - Rows that are already encrypted with the new key (same ciphertext prefix segment
 *     is already current) are detected by attempting decryption with the new key first;
 *     if that succeeds, the row is skipped.
 *   - Dry-run mode (--dry-run flag) prints what would happen without writing anything.
 *
 * The stored format changes from gcm:<iv>:<tag>:<data>  (or gcm:v0:…)
 *                               to   gcm:v1:<iv>:<tag>:<data>
 */
import { db, userCredentialsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { encryptWithKey, decryptWithKeyHex } from "./crypto-utils.js";

const DRY_RUN = process.argv.includes("--dry-run");

function validateKeyHex(envVar: string, label: string): string {
  const val = process.env[envVar];
  if (!val || val.length !== 64) {
    console.error(
      `ERROR: ${envVar} (${label}) must be set to a 64-character hex string.\n` +
        `  Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
    process.exit(1);
  }
  return val;
}

async function main() {
  const oldKeyHex = validateKeyHex("OLD_CREDENTIAL_ENCRYPTION_KEY", "old key");
  const newKeyHex = validateKeyHex("CREDENTIAL_ENCRYPTION_KEY", "new key");

  if (oldKeyHex === newKeyHex) {
    console.error("ERROR: OLD_CREDENTIAL_ENCRYPTION_KEY and CREDENTIAL_ENCRYPTION_KEY are identical. Nothing to do.");
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log("DRY RUN — no database changes will be made.\n");
  }

  const rows = await db
    .select({ id: userCredentialsTable.id, encryptedValue: userCredentialsTable.encryptedValue })
    .from(userCredentialsTable);

  console.log(`Found ${rows.length} credential row(s).`);

  const toRotate: Array<{ id: number; plaintext: string }> = [];
  let alreadyNew = 0;
  let failed = 0;

  for (const row of rows) {
    // Try to decrypt with the new key first — if it works, the row is already rotated.
    try {
      decryptWithKeyHex(row.encryptedValue, newKeyHex);
      alreadyNew++;
      continue;
    } catch {
      // Expected: row was not encrypted with the new key yet.
    }

    // Decrypt with the old key.
    try {
      const plaintext = decryptWithKeyHex(row.encryptedValue, oldKeyHex);
      toRotate.push({ id: row.id, plaintext });
    } catch (err) {
      console.error(`  FAILED to decrypt row id=${row.id} with old key:`, err);
      failed++;
    }
  }

  console.log(
    `  Already on new key: ${alreadyNew}  |  To rotate: ${toRotate.length}  |  Unreadable: ${failed}`
  );

  if (failed > 0) {
    console.error(
      `\nAborting — ${failed} row(s) could not be decrypted with either key.\n` +
        "Resolve those rows manually before retrying."
    );
    process.exit(1);
  }

  if (toRotate.length === 0) {
    console.log("\nAll rows are already encrypted with the new key. Nothing to do.");
    return;
  }

  if (DRY_RUN) {
    console.log(`\nDry run complete — would rotate ${toRotate.length} row(s). Exiting without changes.`);
    return;
  }

  const newKeyBuf = Buffer.from(newKeyHex, "hex");

  // Execute all updates in a single transaction for atomicity.
  await db.transaction(async (tx) => {
    for (const { id, plaintext } of toRotate) {
      const newValue = encryptWithKey(plaintext, newKeyBuf);
      await tx
        .update(userCredentialsTable)
        .set({ encryptedValue: newValue, updatedAt: new Date() })
        .where(eq(userCredentialsTable.id, id));
    }
  });

  console.log(`\nRotation complete — ${toRotate.length} row(s) re-encrypted successfully.`);
  console.log(
    "\nNext step: update the CREDENTIAL_KEY_ROTATED_AT environment variable to reset the admin warning:\n" +
      `  CREDENTIAL_KEY_ROTATED_AT=${new Date().toISOString()}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
