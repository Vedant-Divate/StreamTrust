/**
 * GET /api/assessments/:id — full draft view (owner only).
 * PATCH /api/assessments/:id — update draft fields and indicator entries
 * (owner only, draft only). Entry values are validated structurally here;
 * cross-field consistency is the Phase 5 rule engine's job.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { indicatorEntrySchema } from "@/domain/schemas";
import { db } from "@/server/db/client";
import {
  getAssessmentView,
  updateAssessmentDraft,
  upsertIndicatorEntry,
} from "@/server/db/repositories/assessments";
import { errorBody, requireOwnedAssessment } from "@/server/security/volunteer-cookie";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await requireOwnedAssessment(db, id, req);
  if (owned.error) return owned.error;
  const view = await getAssessmentView(db, id);
  return NextResponse.json(view);
}

const patchSchema = z.object({
  observed_at: z.string().optional(),
  rain_last_24h: z.string().optional(),
  notes: z.string().max(2000).nullable().optional(),
  entries: z.array(z.object({ indicator: z.string(), final_value: z.string() })).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
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
  const raw = patchSchema.safeParse(body);
  if (!raw.success) {
    return NextResponse.json(
      errorBody("invalid_input", "Invalid update payload.", raw.error.issues),
      { status: 400 }
    );
  }

  if (
    raw.data.observed_at !== undefined ||
    raw.data.rain_last_24h !== undefined ||
    raw.data.notes !== undefined
  ) {
    await updateAssessmentDraft(db, id, {
      ...(raw.data.observed_at !== undefined ? { observedAt: raw.data.observed_at } : {}),
      ...(raw.data.rain_last_24h !== undefined ? { rainLast24h: raw.data.rain_last_24h } : {}),
      ...(raw.data.notes !== undefined ? { notes: raw.data.notes } : {}),
    });
  }

  if (raw.data.entries !== undefined) {
    for (const e of raw.data.entries) {
      const entry = indicatorEntrySchema.safeParse({
        indicator: e.indicator,
        finalValue: e.final_value,
      });
      if (!entry.success) {
        return NextResponse.json(
          errorBody("invalid_input", "Invalid indicator entry.", entry.error.issues),
          { status: 400 }
        );
      }
      // No AI suggestions exist in Phase 2, so every value is human-set.
      await upsertIndicatorEntry(db, {
        assessmentId: id,
        indicator: entry.data.indicator,
        finalValue: entry.data.finalValue,
        decisionSource: "human_only",
      });
    }
  }

  const view = await getAssessmentView(db, id);
  return NextResponse.json(view);
}
