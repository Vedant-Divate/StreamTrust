/**
 * AI-vs-human agreement aggregates (PROJECT.md Phase 7).
 * Pure math over joined rows (`computeAgreement`, unit-tested with known
 * inputs) plus a thin DB fetch (`getInsightRows`). Scope: submitted
 * assessments only — draft `decision_source` values are placeholders and
 * drafts are still mutable, so they must not feed a trust dashboard.
 */
import { eq } from "drizzle-orm";
import type { DbClient } from "@/server/db/client";
import { assessments, indicatorEntries } from "@/server/db/schema";
import { getLatestSuggestionsByAssessment } from "@/server/db/repositories/suggestions";
import { CANNOT_DETERMINE } from "@/server/ai/normalize";

export type DemoMode = "include" | "only" | "exclude";

export interface InsightRow {
  indicator: string;
  finalValue: string;
  decisionSource: string;
  suggestedValue: string | null;
  confidenceBand: string | null;
  isDemo: boolean;
}

export interface IndicatorStat {
  indicator: string;
  pairs: number;
  agreed: number;
  rate: number | null;
  overrides: number;
}

export interface BandStat {
  band: string;
  pairs: number;
  agreed: number;
  rate: number | null;
}

export interface AgreementSummary {
  pairs: number;
  agreed: number;
  rate: number | null;
  overrides: number;
  byIndicator: IndicatorStat[];
  byBand: BandStat[];
}

function rate(agreed: number, pairs: number): number | null {
  if (pairs === 0) return null;
  return Math.round((agreed / pairs) * 1000) / 10;
}

/**
 * A pair is an entry with a real (non-abstained) latest AI suggestion.
 * Agreement = final value equals the suggestion.
 */
export function computeAgreement(rows: InsightRow[]): AgreementSummary {
  const pairs = rows.filter(
    (r) => r.suggestedValue !== null && r.suggestedValue !== CANNOT_DETERMINE
  );
  const agreed = pairs.filter((r) => r.finalValue === r.suggestedValue).length;
  const overrides = pairs.filter((r) => r.decisionSource === "human_override").length;

  const byIndicator: IndicatorStat[] = [];
  for (const row of pairs) {
    let stat = byIndicator.find((s) => s.indicator === row.indicator);
    if (!stat) {
      stat = { indicator: row.indicator, pairs: 0, agreed: 0, rate: null, overrides: 0 };
      byIndicator.push(stat);
    }
    stat.pairs += 1;
    if (row.finalValue === row.suggestedValue) stat.agreed += 1;
    if (row.decisionSource === "human_override") stat.overrides += 1;
  }
  for (const stat of byIndicator) stat.rate = rate(stat.agreed, stat.pairs);
  byIndicator.sort((a, b) => a.indicator.localeCompare(b.indicator));

  const byBand: BandStat[] = [];
  for (const row of pairs) {
    const band = row.confidenceBand ?? "none";
    let stat = byBand.find((s) => s.band === band);
    if (!stat) {
      stat = { band, pairs: 0, agreed: 0, rate: null };
      byBand.push(stat);
    }
    stat.pairs += 1;
    if (row.finalValue === row.suggestedValue) stat.agreed += 1;
  }
  for (const stat of byBand) stat.rate = rate(stat.agreed, stat.pairs);

  return {
    pairs: pairs.length,
    agreed,
    rate: rate(agreed, pairs.length),
    overrides,
    byIndicator,
    byBand,
  };
}

/** Fetch joined rows for submitted assessments, filtered by demo mode. */
export async function getInsightRows(db: DbClient, demo: DemoMode): Promise<InsightRow[]> {
  const submitted = await db
    .select({
      id: assessments.id,
      isDemo: assessments.isDemo,
    })
    .from(assessments)
    .where(eq(assessments.status, "submitted"));
  const wanted = submitted.filter((a) =>
    demo === "include" ? true : demo === "only" ? a.isDemo : !a.isDemo
  );
  const demoById = new Map(wanted.map((a) => [a.id, a.isDemo]));

  const rows: InsightRow[] = [];
  for (const assessment of wanted) {
    const entries = await db
      .select()
      .from(indicatorEntries)
      .where(eq(indicatorEntries.assessmentId, assessment.id));
    const latest = await getLatestSuggestionsByAssessment(db, assessment.id);
    for (const entry of entries) {
      const suggestion = latest.get(entry.indicator);
      rows.push({
        indicator: entry.indicator,
        finalValue: entry.finalValue,
        decisionSource: entry.decisionSource,
        suggestedValue: suggestion?.suggestedValue ?? null,
        confidenceBand: suggestion?.confidenceBand ?? null,
        isDemo: demoById.get(assessment.id) ?? false,
      });
    }
  }
  return rows;
}

export async function getAgreement(
  db: DbClient,
  demo: DemoMode
): Promise<{ demo: DemoMode; summary: AgreementSummary }> {
  return { demo, summary: computeAgreement(await getInsightRows(db, demo)) };
}
