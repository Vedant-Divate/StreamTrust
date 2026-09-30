import type { RuleResult, RuleInput } from "@/domain/rules/types";

/** 5-minute clock-skew tolerance (Section 9, R-FUTURE-TIME). */
export const FUTURE_SKEW_MS = 5 * 60 * 1000;

/** R-FUTURE-TIME: the observation must not lie beyond the skew window. */
export function checkObservedTime(input: RuleInput, now: Date = new Date()): RuleResult[] {
  const observed = Date.parse(input.observedAt);
  if (Number.isNaN(observed)) return [];
  if (observed - now.getTime() <= FUTURE_SKEW_MS) return [];
  return [
    {
      ruleId: "R-FUTURE-TIME",
      severity: "error",
      indicators: [],
      message: "The observation time is in the future.",
    },
  ];
}
