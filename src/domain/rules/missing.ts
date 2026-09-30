import { INDICATOR_CODES } from "@/domain/vocab";
import type { RuleResult, RuleInput } from "@/domain/rules/types";

/** R-MISSING: every indicator must have a value before submitting. */
export function checkMissing(input: RuleInput): RuleResult[] {
  const missing = INDICATOR_CODES.filter((c) => !input.entries[c]);
  if (missing.length === 0) return [];
  return [
    {
      ruleId: "R-MISSING",
      severity: "error",
      indicators: [...missing],
      message: "Please answer every question before submitting.",
    },
  ];
}
