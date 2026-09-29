/**
 * GET /api/health — liveness + DB check + non-secret config presence.
 * Never touches secrets or the AI provider.
 */
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

export async function GET() {
  let database: "up" | "down" = "down";
  try {
    await db.run(sql`SELECT 1`);
    database = "up";
  } catch {
    database = "down";
  }
  const ok = database === "up";
  return NextResponse.json(
    {
      status: ok ? "ok" : "unavailable",
      db: database,
      aiProvider: process.env.AI_PROVIDER ?? "mock",
      fhirValidationBaseUrl: process.env.FHIR_VALIDATION_BASE_URL ?? "https://hapi.fhir.org/baseR4",
    },
    { status: ok ? 200 : 503 }
  );
}
