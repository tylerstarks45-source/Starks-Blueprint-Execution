// Prints `export PG...=...` lines for the postgres:// URL in $PGENV_URL so
// pg_dump/pg_restore/psql get the connection from the environment instead of argv
// (argv is visible to other processes on the host). Exits non-zero, printing
// nothing, if the URL is invalid or names no database.
let url;
try {
  url = new URL(process.env.PGENV_URL ?? "");
} catch {
  console.error("Invalid database URL");
  process.exit(1);
}
const quote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
const env = {
  PGHOST: decodeURIComponent(url.hostname),
  PGPORT: url.port,
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, "")),
};
const params = { host: "PGHOST", port: "PGPORT", sslmode: "PGSSLMODE", sslrootcert: "PGSSLROOTCERT", options: "PGOPTIONS", application_name: "PGAPPNAME" };
for (const [k, v] of url.searchParams) if (params[k]) env[params[k]] = v;
if (!env.PGDATABASE) {
  console.error("Database URL has no database name");
  process.exit(1);
}
for (const name of ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGSSLMODE", "PGSSLROOTCERT", "PGOPTIONS", "PGAPPNAME", "PGSERVICE"]) {
  console.log(env[name] ? `export ${name}=${quote(env[name])}` : `unset ${name}`);
}
