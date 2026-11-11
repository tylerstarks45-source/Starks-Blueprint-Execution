import path from "node:path";
import { fileURLToPath } from "node:url";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { pool } from "@workspace/db";

// One-time step for databases created with `drizzle-kit push`: records the
// 0000_baseline migration as applied without executing it. Only run this after
// the database matches the schema at the baseline (see docs/engineering/database-migrations.md).
const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../lib/db/drizzle");

async function main() {
  const [baseline] = readMigrationFiles({ migrationsFolder });
  if (!baseline) throw new Error(`No migrations found in ${migrationsFolder}`);

  const { rows } = await pool.query<{ has_users: boolean }>(`SELECT to_regclass('public.users') IS NOT NULL AS has_users`);
  if (!rows[0].has_users) {
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
  const existing = await pool.query(`SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = $1`, [baseline.hash]);
  if (existing.rowCount) {
    console.log("Baseline already recorded.");
  } else {
    await pool.query(`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`, [baseline.hash, baseline.folderMillis]);
    console.log("Baseline recorded as applied.");
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error("Baseline failed:", err);
  await pool.end().catch(() => {});
  process.exit(1);
});
