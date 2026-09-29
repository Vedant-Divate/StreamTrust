/**
 * Anonymous volunteer identity (PROJECT.md Sections 7.4, 10.2).
 * No PII is collected: the cookie holds a random UUID that maps to
 * `volunteers.id`. Ownership helper included so every assessment/photo
 * route enforces the match in one place.
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { DbClient } from "@/server/db/client";
import { getAssessmentById } from "@/server/db/repositories/assessments";

export const VOLUNTEER_COOKIE = "st_vid";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Read the volunteer id from the request's Cookie header, if present. */
export function getVolunteerId(req: Request): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === VOLUNTEER_COOKIE) {
      const value = part.slice(eq + 1).trim();
      return value === "" ? undefined : value;
    }
  }
  return undefined;
}

/** Issue (or refresh) the anonymous volunteer cookie on a response. */
export function issueVolunteerCookie(res: NextResponse, id: string = randomUUID()): string {
  res.cookies.set(VOLUNTEER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return id;
}

export function errorBody(code: string, message: string, details?: unknown) {
  return {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

export type OwnedAssessment = Exclude<Awaited<ReturnType<typeof getAssessmentById>>, undefined>;

/**
 * Enforce ownership: missing cookie → 403; unknown assessment or
 * volunteer mismatch → 404 (no existence leak, consistent per route).
 */
export async function requireOwnedAssessment(
  db: DbClient,
  assessmentId: string,
  req: Request
): Promise<
  | { assessment: OwnedAssessment; volunteerId: string; error?: undefined }
  | { assessment?: undefined; volunteerId?: undefined; error: NextResponse }
> {
  const volunteerId = getVolunteerId(req);
  if (!volunteerId) {
    return {
      error: NextResponse.json(errorBody("forbidden", "A volunteer cookie is required."), {
        status: 403,
      }),
    };
  }
  const assessment = await getAssessmentById(db, assessmentId);
  if (!assessment || assessment.volunteerId !== volunteerId) {
    return {
      error: NextResponse.json(errorBody("not_found", "Assessment not found."), {
        status: 404,
      }),
    };
  }
  return { assessment, volunteerId };
}
