/**
 * GET /api/assessments/:id/fhir — transaction Bundle (owner only,
 * submitted only).
 */
import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { buildBundle } from "@/server/fhir/build-bundle";
import { errorBody, requireOwnedAssessment } from "@/server/security/volunteer-cookie";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await requireOwnedAssessment(db, id, req);
  if (owned.error) return owned.error;
  if (owned.assessment.status !== "submitted") {
    return NextResponse.json(errorBody("not_draft", "FHIR export is available after submission."), {
      status: 409,
    });
  }
  const bundle = await buildBundle(db, id);
  return NextResponse.json(bundle);
}
