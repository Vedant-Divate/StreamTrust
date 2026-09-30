/**
 * POST /api/assessments/:id/fhir/validate — send the Bundle to the FHIR
 * validator, store the outcome in fhir_exports (owner only, submitted
 * only). Only ever demo/non-sensitive data (rounded coords, no names).
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { fhirExports } from "@/server/db/schema";
import { buildBundle } from "@/server/fhir/build-bundle";
import { ValidatorError, validateBundle, validationBaseUrl } from "@/server/fhir/validator-client";
import { errorBody, requireOwnedAssessment } from "@/server/security/volunteer-cookie";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await requireOwnedAssessment(db, id, req);
  if (owned.error) return owned.error;
  if (owned.assessment.status !== "submitted") {
    return NextResponse.json(
      errorBody("not_draft", "FHIR validation is available after submission."),
      { status: 409 }
    );
  }
  const bundle = await buildBundle(db, id);
  const baseUrl = validationBaseUrl();
  let summary;
  try {
    summary = await validateBundle(bundle);
  } catch (err) {
    if (err instanceof ValidatorError) {
      return NextResponse.json(errorBody("validator_unavailable", err.message), { status: 502 });
    }
    throw err;
  }
  await db.insert(fhirExports).values({
    id: randomUUID(),
    assessmentId: id,
    bundleJson: JSON.stringify(bundle),
    validatorBaseUrl: baseUrl,
    validatorOutcomeJson: JSON.stringify(summary.outcome),
    errorCount: summary.errorCount,
    warningCount: summary.warningCount,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({
    errorCount: summary.errorCount,
    warningCount: summary.warningCount,
    infoCount: summary.infoCount,
    issues: summary.issues,
    validatorBaseUrl: baseUrl,
  });
}
