/**
 * POST /api/assessments/:id/acks — record an explicit warning
 * acknowledgement (owner only, draft only). The review UI calls this once
 * per warning via its "I understand, continue" button.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { KNOWN_RULE_IDS } from "@/domain/rules/index";
import { db } from "@/server/db/client";
import { addWarningAck } from "@/server/db/repositories/assessments";
import { errorBody, requireOwnedAssessment } from "@/server/security/volunteer-cookie";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  rule_id: z.string().min(1).max(64),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await requireOwnedAssessment(db, id, req);
  if (owned.error) return owned.error;
  if (owned.assessment.status !== "draft") {
    return NextResponse.json(errorBody("not_draft", "Submitted assessments cannot be edited."), {
      status: 409,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(errorBody("invalid_input", "Request body must be JSON."), {
      status: 400,
    });
  }
  const raw = bodySchema.safeParse(body);
  if (!raw.success || !(KNOWN_RULE_IDS as readonly string[]).includes(raw.data.rule_id)) {
    return NextResponse.json(errorBody("invalid_input", "Unknown rule id."), { status: 400 });
  }

  const ack = await addWarningAck(db, {
    assessmentId: id,
    ruleId: raw.data.rule_id,
    note: raw.data.note,
  });
  return NextResponse.json({ ack }, { status: 201 });
}
