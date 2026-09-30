/**
 * POST /api/assessments/:id/submit — finalize a draft (owner only).
 * Server-side gating, in order: completeness (400), any error-severity
 * rule result (422), every fired warning acknowledged (422). Only then
 * decision_source is recomputed and the row finalized. Rule gating
 * warnings beyond "all answered" is new in Phase 5.
 * `decision_source` is recomputed server-side per Section 7.2 and never
 * trusted from the client.
 */
import { NextResponse } from "next/server";
import { CANNOT_DETERMINE } from "@/server/ai/normalize";
import { INDICATOR_CODES } from "@/domain/vocab";
import { runAllRules } from "@/domain/rules/index";
import type { DecisionSource } from "@/domain/types";
import { db } from "@/server/db/client";
import {
  getIndicatorEntries,
  getWarningAcks,
  setEntryDecisionSource,
  submitAssessment,
} from "@/server/db/repositories/assessments";
import { getLatestSuggestionsByAssessment } from "@/server/db/repositories/suggestions";
import { errorBody, requireOwnedAssessment } from "@/server/security/volunteer-cookie";
import { buildRuleInput } from "@/server/validation/build-input";

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

  let photoWaiver = false;
  try {
    const body = (await req.json()) as { photo_waiver?: unknown };
    photoWaiver = body.photo_waiver === true;
  } catch {
    photoWaiver = false;
  }
  const input = await buildRuleInput(db, id, photoWaiver);
  if (!input) {
    return NextResponse.json(errorBody("not_found", "Assessment not found."), { status: 404 });
  }
  const results = runAllRules(input);
  const errors = results.filter((r) => r.severity === "error");
  if (errors.length > 0) {
    return NextResponse.json(errorBody("validation_failed", "Fix these problems first.", errors), {
      status: 422,
    });
  }
  const warnings = results.filter((r) => r.severity === "warning");
  if (warnings.length > 0) {
    const acked = new Set((await getWarningAcks(db, id)).map((a) => a.ruleId));
    const unacked = warnings.map((w) => w.ruleId).filter((ruleId) => !acked.has(ruleId));
    if (unacked.length > 0) {
      return NextResponse.json(
        errorBody("unacknowledged_warnings", "Acknowledge these warnings first.", {
          missing: unacked,
        }),
        { status: 422 }
      );
    }
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
  const assessment = await submitAssessment(db, id, { photoWaived: photoWaiver });
  return NextResponse.json({ assessment });
}
