/**
 * Apply Drizzle migrations to DATABASE_URL (defaults to file:./local.db).
 * Run: pnpm db:migrate
 *
 * A fresh libSQL file database has no tables until this runs — without it
 * every write fails (e.g. draft creation 500s with an empty body and the
 * UI can only show its generic error). Same migrator the e2e setup and
 * repository tests use, so no drift. Safe to re-run (journal-guarded).
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./local.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const client = createClient(authToken ? { url, authToken } : { url });
  await migrate(drizzle(client), { migrationsFolder: "./src/server/db/migrations" });
  client.close();
  console.log(`migrated ${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
