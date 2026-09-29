/**
 * In-memory libSQL database for repository tests. Each test gets an
 * isolated database with the real generated migration applied.
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/server/db/schema";

export async function createTestDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./src/server/db/migrations" });
  return {
    db,
    async cleanup() {
      client.close();
    },
  };
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];
