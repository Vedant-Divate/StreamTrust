/**
 * Assemble a FHIR R4 transaction Bundle for a submitted assessment
 * (Section 10.1). 1 Location + 1 Practitioner + 1 Device + 6 Observations
 * + 6 Provenances, cross-linked by urn:uuid fullUrls.
 */
import type { Bundle } from "fhir/r4";
import { INDICATOR_CODES } from "@/domain/vocab";
import { PROMPT_VERSION } from "@/server/ai/prompt";
import type { DbClient } from "@/server/db/client";
import {
  getAssessmentById,
  getIndicatorEntries,
  getSiteById,
} from "@/server/db/repositories/assessments";
import { getLatestSuggestionsByAssessment } from "@/server/db/repositories/suggestions";
import { newId, urn, type SuggestionData } from "@/server/fhir/mappers/common";
import { mapDevice } from "@/server/fhir/mappers/device";
import { mapLocation } from "@/server/fhir/mappers/location";
import { mapObservation } from "@/server/fhir/mappers/observation";
import { mapPractitioner } from "@/server/fhir/mappers/practitioner";
import { mapProvenance } from "@/server/fhir/mappers/provenance";

export async function buildBundle(
  db: DbClient,
  assessmentId: string,
  opts: { useExtensions?: boolean } = {}
): Promise<Bundle> {
  const useExtensions = opts.useExtensions ?? true;
  const assessment = await getAssessmentById(db, assessmentId);
  if (!assessment || assessment.status !== "submitted" || !assessment.submittedAt) {
    throw new Error("Bundle requires a submitted assessment.");
  }
  const site = await getSiteById(db, assessment.siteId);
  if (!site) throw new Error("Assessment site is missing.");
  const entries = await getIndicatorEntries(db, assessmentId);
  const latest = await getLatestSuggestionsByAssessment(db, assessmentId);

  const locationId = newId();
  const practitionerId = newId();
  const deviceId = newId();

  const firstSuggestion = [...latest.values()].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : 1
  )[0];
  const envModel = (process.env.AI_MODEL ?? "").trim();
  const model = firstSuggestion?.model || envModel || "manual";

  const bundle: Bundle = {
    resourceType: "Bundle",
    type: "transaction",
    entry: [
      {
        fullUrl: urn(locationId),
        resource: mapLocation({ name: site.name, lat: site.lat, lng: site.lng }, locationId),
        request: { method: "POST", url: "Location" },
      },
      {
        fullUrl: urn(practitionerId),
        resource: mapPractitioner(assessment.volunteerId, practitionerId),
        request: { method: "POST", url: "Practitioner" },
      },
      {
        fullUrl: urn(deviceId),
        resource: mapDevice(model, PROMPT_VERSION, deviceId),
        request: { method: "POST", url: "Device" },
      },
    ],
  };

  for (const code of INDICATOR_CODES) {
    const entry = entries.find((e) => e.indicator === code);
    if (!entry) throw new Error(`Submitted assessment is missing entry ${code}.`);
    const row = latest.get(code);
    const suggestion: SuggestionData | undefined = row
      ? {
          suggestedValue: row.suggestedValue,
          confidenceBand: row.confidenceBand,
          evidence: row.evidence,
          cues: JSON.parse(row.cuesJson) as string[],
          provider: row.provider,
          model: row.model,
          promptVersion: row.promptVersion,
        }
      : undefined;
    const observationId = newId();
    const provenanceId = newId();
    bundle.entry!.push(
      {
        fullUrl: urn(observationId),
        resource: mapObservation({
          id: observationId,
          indicator: code,
          entry: {
            indicator: code,
            finalValue: entry.finalValue,
            decisionSource: entry.decisionSource,
          },
          suggestion,
          locationId,
          practitionerId,
          observedAt: assessment.observedAt,
          photoWaived: assessment.photoWaived,
        }),
        request: { method: "POST", url: "Observation" },
      },
      {
        fullUrl: urn(provenanceId),
        resource: mapProvenance({
          id: provenanceId,
          observationId,
          practitionerId,
          deviceId,
          submittedAt: assessment.submittedAt,
          entry: {
            indicator: code,
            finalValue: entry.finalValue,
            decisionSource: entry.decisionSource,
          },
          suggestion,
          useExtensions,
        }),
        request: { method: "POST", url: "Provenance" },
      }
    );
  }
  return bundle;
}
