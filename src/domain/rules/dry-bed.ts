import { NOT_APPLICABLE, NOT_APPLICABLE_INDICATORS } from "@/domain/vocab";
import type { RuleResult, RuleInput } from "@/domain/rules/types";

const WATER_APPEARANCE = ["clarity", "color", "algae"] as const;

/**
 * R-DRY-WATER: `flow=dry` requires the water-appearance questions to be
 * `not_applicable`. Server-side backstop for the wizard's N/A cascade.
 */
export function checkDryWater(input: RuleInput): RuleResult[] {
  if (input.entries.flow !== "dry") return [];
  const offending = WATER_APPEARANCE.filter((c) => input.entries[c] !== NOT_APPLICABLE);
  if (offending.length === 0) return [];
  return [
    {
      ruleId: "R-DRY-WATER",
      severity: "error",
      indicators: [...offending],
      message:
        "You said there's no water, so water-appearance questions don't apply. Please check.",
    },
  ];
}

/**
 * R-NA-WITHOUT-DRY: `not_applicable` is only meaningful on a dry bed.
 * Catches stale N/A values that bypass the UI cascade (e.g. direct API
 * calls), whatever the flow value — including an unanswered flow.
 */
export function checkNaWithoutDry(input: RuleInput): RuleResult[] {
  const misused = NOT_APPLICABLE_INDICATORS.filter((c) => input.entries[c] === NOT_APPLICABLE);
  if (misused.length === 0 || input.entries.flow === "dry") return [];
  return [
    {
      ruleId: "R-NA-WITHOUT-DRY",
      severity: "error",
      indicators: [...misused],
      message: "'Not applicable' is only for dry stream beds.",
    },
  ];
}

export function checkDryBed(input: RuleInput): RuleResult[] {
  return [...checkDryWater(input), ...checkNaWithoutDry(input)];
}
