// Prints `export PG...=...` lines for a postgres:// URL so pg_dump/pg_restore/psql
// get the connection from the environment instead of argv (argv is visible to
// other processes on the host).
const url = new URL(process.argv[2] ?? "");
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
for (const name of ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGSSLMODE", "PGSSLROOTCERT", "PGOPTIONS", "PGAPPNAME", "PGSERVICE"]) {
  console.log(env[name] ? `export ${name}=${quote(env[name])}` : `unset ${name}`);
}
