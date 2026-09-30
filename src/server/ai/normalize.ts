/**
 * Normalize a provider's raw payload into validated suggestions
 * (PROJECT.md Sections 8.2–8.3, 8.5). Enforced unconditionally,
 * regardless of which model or path produced the raw response:
 * - `odor` is ALWAYS `cannot_determine` (smell can't come from a photo)
 * - unrecognized values (or `not_applicable`, which the AI must never
 *   suggest) become `cannot_determine`
 * - confidence is clamped to [0,1] and mapped to a band
 */
import { getIndicator, NOT_APPLICABLE, type IndicatorCode } from "@/domain/vocab";
import type { ConfidenceBand } from "@/domain/types";
import type { RawSuggestResult } from "@/server/ai/provider";

export const CANNOT_DETERMINE = "cannot_determine";
export const MAX_EVIDENCE_LENGTH = 240;

export interface NormalizedSuggestion {
  indicator: IndicatorCode;
  suggestedValue: string;
  confidenceBand: ConfidenceBand;
  confidenceScore: number | null;
  evidence: string;
  cues: string[];
}

export function confidenceToBand(score: number): Exclude<ConfidenceBand, "none"> {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function abstain(indicator: IndicatorCode): NormalizedSuggestion {
  return {
    indicator,
    suggestedValue: CANNOT_DETERMINE,
    confidenceBand: "none",
    confidenceScore: null,
    evidence: "",
    cues: [],
  };
}

function clampConfidence(raw: unknown): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return 0;
  return Math.min(1, Math.max(0, raw));
}

function cleanEvidence(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.slice(0, MAX_EVIDENCE_LENGTH);
}

function cleanCues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c): c is string => typeof c === "string");
}

export function normalizeSuggestions(raw: unknown): NormalizedSuggestion[] {
  if (typeof raw !== "object" || raw === null) return [];
  const indicators = (raw as Partial<RawSuggestResult>).indicators;
  if (!Array.isArray(indicators)) return [];

  const out: NormalizedSuggestion[] = [];
  for (const row of indicators) {
    if (typeof row !== "object" || row === null) continue;
    const { indicator, value, confidence, evidence, visible_cues } = row as {
      indicator?: unknown;
      value?: unknown;
      confidence?: unknown;
      evidence?: unknown;
      visible_cues?: unknown;
    };
    if (typeof indicator !== "string") continue;
    const def = getIndicator(indicator);
    if (!def) continue; // unknown indicator: no place to store it
    const code = def.code;

    // Odor can never be judged from a photo — overwrite any guess,
    // including its evidence (a guessed smell has no visible basis).
    if (code === "odor") {
      out.push(abstain(code));
      continue;
    }
    const valid = typeof value === "string" && def.values.some((v) => v.code === value);
    if (!valid || value === CANNOT_DETERMINE || value === NOT_APPLICABLE) {
      out.push(abstain(code));
      continue;
    }
    const score = clampConfidence(confidence);
    out.push({
      indicator: code,
      suggestedValue: value as string,
      confidenceBand: confidenceToBand(score),
      confidenceScore: score,
      evidence: cleanEvidence(evidence),
      cues: cleanCues(visible_cues),
    });
  }
  return out;
}
