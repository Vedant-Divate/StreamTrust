/**
 * POST /api/assessments/:id/submit — finalize a draft (owner only).
 * Phase 3 gating: every indicator must have a value. Warning/error rule
 * gating arrives in Phase 5.
 */
import { NextResponse } from "next/server";
import { INDICATOR_CODES } from "@/domain/vocab";
import { db } from "@/server/db/client";
import { getIndicatorEntries, submitAssessment } from "@/server/db/repositories/assessments";
import { errorBody, requireOwnedAssessment } from "@/server/security/volunteer-cookie";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await requireOwnedAssessment(db, id, req);
  if (owned.error) return owned.error;
  if (owned.assessment.status !== "draft") {
    return NextResponse.json(errorBody("not_draft", "This assessment is already submitted."), {
      status: 409,
    });
  }
  const entries = await getIndicatorEntries(db, id);
  const answered = new Set(entries.map((e) => e.indicator));
  const missing = INDICATOR_CODES.filter((c) => !answered.has(c));
  if (missing.length > 0) {
    return NextResponse.json(
      errorBody("incomplete", "Answer every question before submitting.", { missing }),
      { status: 400 }
    );
  }
  const assessment = await submitAssessment(db, id);
  return NextResponse.json({ assessment });
}
