import path from "node:path";
import { fileURLToPath } from "node:url";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { pool } from "@workspace/db";

// One-time step for databases created with `drizzle-kit push` (e.g. Replit): records the
// migrations whose tables already exist as applied, without executing them. It walks the
// migrations in order and stops at the first one whose tables are missing, so `db:migrate`
// then applies only what the database doesn't have yet. See docs/engineering/database-migrations.md.
const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../lib/db/drizzle");
const CREATE_TABLE = /CREATE TABLE (?:IF NOT EXISTS )?(?:"?public"?\.)?"?([A-Za-z0-9_]+)"?/g;

async function tableExists(name: string): Promise<boolean> {
  const { rows } = await pool.query<{ ok: boolean }>(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`public.${name}`]);
  return rows[0]!.ok;
}

async function main() {
  const migrations = readMigrationFiles({ migrationsFolder });
  if (!migrations.length) throw new Error(`No migrations found in ${migrationsFolder}`);

  if (!(await tableExists("users"))) {
    console.error("Database has no schema yet; use db:migrate instead of baselining.");
    process.exit(1);
  }

  await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  let recorded = 0;
  for (const [i, m] of migrations.entries()) {
    const tables = [...m.sql.join("\n").matchAll(CREATE_TABLE)].map((x) => x[1]!);
    const missing: string[] = [];
    for (const t of tables) if (!(await tableExists(t))) missing.push(t);
    if (missing.length) {
      console.log(`Migration #${i} is not in the database yet (missing: ${missing.join(", ")}); db:migrate will apply it and the ones after it.`);
      break;
    }
    const existing = await pool.query(`SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = $1`, [m.hash]);
    if (!existing.rowCount) {
      await pool.query(`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`, [m.hash, m.folderMillis]);
      recorded++;
    }
    console.log(`Migration #${i}: already in the database, recorded as applied.`);
  }
  console.log(`Baseline done (${recorded} newly recorded). Next: pnpm --filter @workspace/scripts run db:migrate`);
  await pool.end();
}

main().catch(async (err) => {
  console.error("Baseline failed:", err);
  await pool.end().catch(() => {});
  process.exit(1);
});
