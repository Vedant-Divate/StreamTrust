/**
 * POST /api/assessments/:id/submit — finalize a draft (owner only).
 * Completeness gating here; warning/error rule gating arrives in Phase 5.
 * `decision_source` is recomputed server-side per Section 7.2 and never
 * trusted from the client.
 */
import { NextResponse } from "next/server";
import { CANNOT_DETERMINE } from "@/server/ai/normalize";
import { INDICATOR_CODES } from "@/domain/vocab";
import type { DecisionSource } from "@/domain/types";
import { db } from "@/server/db/client";
import {
  getIndicatorEntries,
  setEntryDecisionSource,
  submitAssessment,
} from "@/server/db/repositories/assessments";
import { getLatestSuggestionsByAssessment } from "@/server/db/repositories/suggestions";
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
  const latest = await getLatestSuggestionsByAssessment(db, id);
  for (const entry of entries) {
    const suggestion = latest.get(entry.indicator);
    let source: DecisionSource = "human_only";
    let suggestionId: string | null = null;
    if (suggestion && suggestion.suggestedValue !== CANNOT_DETERMINE) {
      suggestionId = suggestion.id;
      source = entry.finalValue === suggestion.suggestedValue ? "ai_accepted" : "human_override";
    }
    await setEntryDecisionSource(db, id, entry.indicator, source, suggestionId);
  }
  const assessment = await submitAssessment(db, id);
  return NextResponse.json({ assessment });
}
