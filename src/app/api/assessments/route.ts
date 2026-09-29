/**
 * POST /api/assessments — create a draft assessment.
 * Issues the anonymous `st_vid` cookie when the request has none.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { assessmentCreateSchema } from "@/domain/schemas";
import { db } from "@/server/db/client";
import {
  createAssessment,
  createSite,
  createVolunteer,
} from "@/server/db/repositories/assessments";
import {
  errorBody,
  getVolunteerId,
  issueVolunteerCookie,
} from "@/server/security/volunteer-cookie";

const bodySchema = z.object({
  site: z.object({
    name: z.string().trim().max(120).optional(),
    lat: z.number(),
    lng: z.number(),
    accuracy_m: z.number().optional(),
  }),
  observed_at: z.string(),
  rain_last_24h: z.string(),
  consent: z.unknown(),
  notes: z.string().optional(),
});

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(errorBody("invalid_input", "Request body must be JSON."), {
      status: 400,
    });
  }
  const raw = bodySchema.safeParse(body);
  if (!raw.success) {
    return NextResponse.json(
      errorBody("invalid_input", "Invalid assessment payload.", raw.error.issues),
      { status: 400 }
    );
  }
  const parsed = assessmentCreateSchema.safeParse({
    site: {
      name: raw.data.site.name,
      lat: raw.data.site.lat,
      lng: raw.data.site.lng,
      accuracyM: raw.data.site.accuracy_m,
    },
    observedAt: raw.data.observed_at,
    rainLast24h: raw.data.rain_last_24h,
    consent: raw.data.consent,
    notes: raw.data.notes,
  });
  if (!parsed.success) {
    return NextResponse.json(
      errorBody("invalid_input", "Invalid assessment payload.", parsed.error.issues),
      { status: 400 }
    );
  }

  let volunteerId = getVolunteerId(req);
  let freshCookie = false;
  if (!volunteerId) {
    const volunteer = await createVolunteer(db);
    volunteerId = volunteer.id;
    freshCookie = true;
  }
  const site = await createSite(db, {
    name: parsed.data.site.name,
    lat: round4(parsed.data.site.lat),
    lng: round4(parsed.data.site.lng),
    accuracyM: parsed.data.site.accuracyM,
  });
  const assessment = await createAssessment(db, {
    volunteerId,
    siteId: site.id,
    observedAt: parsed.data.observedAt,
    rainLast24h: parsed.data.rainLast24h,
    notes: parsed.data.notes,
  });

  const res = NextResponse.json({ assessment, site }, { status: 201 });
  if (freshCookie) issueVolunteerCookie(res, volunteerId);
  return res;
}
