/**
 * GET /api/insights?demo=include|only|exclude — public AI-vs-human
 * agreement aggregates. Aggregate-only: no assessment, volunteer, or
 * location data ever leaves this endpoint.
 */
import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { getAgreement, type DemoMode } from "@/server/insights/aggregate";
import { errorBody } from "@/server/security/volunteer-cookie";

const MODES: DemoMode[] = ["include", "only", "exclude"];

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("demo") ?? "exclude";
  if (!(MODES as string[]).includes(raw)) {
    return NextResponse.json(
      errorBody("invalid_input", "demo must be include, only, or exclude."),
      { status: 400 }
    );
  }
  return NextResponse.json(await getAgreement(db, raw as DemoMode));
}
