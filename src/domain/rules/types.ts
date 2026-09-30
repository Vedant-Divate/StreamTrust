/**
 * Validation rule engine types (PROJECT.md Section 9).
 * Pure domain module: no imports from `src/server/**` or `src/app/**`.
 */
import type { IndicatorCode } from "@/domain/vocab";

export type Severity = "error" | "warning" | "info";

export interface RuleResult {
  ruleId: string;
  severity: Severity;
  indicators: string[];
  message: string;
  suggestion?: string;
}

export interface SuggestionInfo {
  suggestedValue: string;
  confidenceBand: string;
}

export interface RuleInput {
  entries: Partial<Record<IndicatorCode, string>>;
  rainLast24h: string;
  observedAt: string;
  site: { lat: number; lng: number } | null;
  photoCount: number;
  photoWaiver: boolean;
  suggestions: Partial<Record<IndicatorCode, SuggestionInfo>>;
}

export type Rule = (input: RuleInput, now?: Date) => RuleResult[];
