/**
 * Shared rule-input assembler for the validate and submit routes.
 * Read-only: fetches assessment context, entries, photos and the latest
 * suggestions, then shapes them for `runAllRules`.
 */
import type { DbClient } from "@/server/db/client";
import {
  getAssessmentById,
  getIndicatorEntries,
  getSiteById,
} from "@/server/db/repositories/assessments";
import { getPhotosByAssessment } from "@/server/db/repositories/photos";
import { getLatestSuggestionsByAssessment } from "@/server/db/repositories/suggestions";
import type { RuleInput, SuggestionInfo } from "@/domain/rules/types";
import type { IndicatorCode } from "@/domain/vocab";

export async function buildRuleInput(
  db: DbClient,
  assessmentId: string,
  photoWaiver: boolean
): Promise<RuleInput | undefined> {
  const assessment = await getAssessmentById(db, assessmentId);
  if (!assessment) return undefined;
  const site = await getSiteById(db, assessment.siteId);
  const entries = await getIndicatorEntries(db, assessmentId);
  const photos = await getPhotosByAssessment(db, assessmentId);
  const latest = await getLatestSuggestionsByAssessment(db, assessmentId);

  const entryRecord = Object.fromEntries(
    entries.map((e) => [e.indicator, e.finalValue])
  ) as Partial<Record<IndicatorCode, string>>;
  const suggestionRecord = Object.fromEntries(
    [...latest.values()].map((s) => [
      s.indicator,
      { suggestedValue: s.suggestedValue, confidenceBand: s.confidenceBand },
    ])
  ) as Partial<Record<IndicatorCode, SuggestionInfo>>;

  return {
    entries: entryRecord,
    rainLast24h: assessment.rainLast24h,
    observedAt: assessment.observedAt,
    site: site ? { lat: site.lat, lng: site.lng } : null,
    photoCount: photos.length,
    photoWaiver,
    suggestions: suggestionRecord,
  };
}
