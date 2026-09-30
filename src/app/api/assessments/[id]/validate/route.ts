/**
 * POST /api/assessments/:id/validate — run the rule engine (owner only).
 * Pure: reads assessment context, returns RuleResult[], writes nothing.
 */
import { NextResponse } from "next/server";
import { runAllRules } from "@/domain/rules/index";
import { db } from "@/server/db/client";
import { errorBody, requireOwnedAssessment } from "@/server/security/volunteer-cookie";
import { buildRuleInput } from "@/server/validation/build-input";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await requireOwnedAssessment(db, id, req);
  if (owned.error) return owned.error;

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
  return NextResponse.json({ results: runAllRules(input) });
}
