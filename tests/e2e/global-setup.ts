/**
 * Playwright global setup: start each run with a freshly migrated
 * file database for the dev server (wired via webServer.env).
 */
import { rmSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

export default async function globalSetup() {
  for (const f of ["./e2e.db", "./e2e.db-journal"]) {
    try {
      rmSync(f);
    } catch {
      // fresh run: nothing to remove
    }
  }
  const client = createClient({ url: "file:./e2e.db" });
  await migrate(drizzle(client), { migrationsFolder: "./src/server/db/migrations" });
  client.close();
}
