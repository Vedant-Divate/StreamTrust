import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/server/db/schema";

/**
 * Shared libSQL connection. Local file DB in dev (`file:./local.db`),
 * Turso in prod via `DATABASE_URL` + `DATABASE_AUTH_TOKEN` (ADR-0003).
 * Repositories take the client as a parameter so tests can inject a
 * temporary database.
 */
function createDb() {
  const url = process.env.DATABASE_URL ?? "file:./local.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  return drizzle(createClient({ url, authToken }), { schema });
}

const globalForDb = globalThis as unknown as { __streamtrustDb?: ReturnType<typeof createDb> };

export const db = globalForDb.__streamtrustDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__streamtrustDb = db;
}

export type DbClient = typeof db;
