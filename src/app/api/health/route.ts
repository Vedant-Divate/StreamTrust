/**
 * GET /api/health — liveness + DB check + non-secret config presence.
 * Never touches secrets or the AI provider.
 *
 * The DB check is a readiness signal, not just connectivity: after
 * confirming the database is reachable, it verifies every table in the
 * Drizzle schema actually exists (a deploy missing a migration must not
 * report healthy). Reachable-but-unmigrated returns 503 with an explicit
 * reason so deploy smoke tests can trust this endpoint.
 */
import { NextResponse } from "next/server";
import { getTableName, is, sql, Table } from "drizzle-orm";
import { db } from "@/server/db/client";
import * as schema from "@/server/db/schema";

const EXPECTED_TABLES = Object.values(schema)
  .filter((v) => is(v, Table))
  .map((t) => getTableName(t));

type DbState = "up" | "down" | "unmigrated";

export async function GET() {
  let database: DbState = "down";
  let detail: string | undefined;
  try {
    await db.run(sql`SELECT 1`);
    const rows = await db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table'`
    );
    const present = new Set(rows.map((r) => r.name));
    const missing = EXPECTED_TABLES.filter((t) => !present.has(t));
    if (missing.length === 0) {
      database = "up";
    } else {
      database = "unmigrated";
      detail = `db reachable but not migrated: missing tables: ${missing.join(", ")}`;
    }
  } catch {
    database = "down";
  }
  const ok = database === "up";
  return NextResponse.json(
    {
      status: ok ? "ok" : "unavailable",
      db: database,
      ...(detail ? { detail } : {}),
      aiProvider: process.env.AI_PROVIDER ?? "mock",
      fhirValidationBaseUrl: process.env.FHIR_VALIDATION_BASE_URL ?? "https://hapi.fhir.org/baseR4",
    },
    { status: ok ? 200 : 503 }
  );
}
