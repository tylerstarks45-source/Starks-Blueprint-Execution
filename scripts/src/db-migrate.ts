import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "@workspace/db";

// Applies versioned migrations from lib/db/drizzle. Refuses to run against a
// database that was provisioned with `drizzle-kit push` and never baselined,
// since the baseline migration would try to re-create every existing table.
const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../lib/db/drizzle");

async function main() {
  const { rows } = await pool.query<{ has_users: boolean; has_journal: boolean }>(`
    SELECT to_regclass('public.users') IS NOT NULL AS has_users,
           to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS has_journal
  `);
  const { has_users, has_journal } = rows[0];
  let applied = 0;
  if (has_journal) {
    const res = await pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM drizzle.__drizzle_migrations`);
    applied = Number(res.rows[0].n);
  }
  if (has_users && applied === 0) {
    console.error(
      "This database already has the schema but no migration history (it was created with drizzle-kit push).\n" +
        "Run `pnpm --filter @workspace/scripts run db:baseline` once to mark the baseline as applied, then re-run migrate.",
    );
    process.exit(1);
  }
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied.");
  await pool.end();
}

main().catch(async (err) => {
  console.error("Migration failed:", err);
  await pool.end().catch(() => {});
  process.exit(1);
});
