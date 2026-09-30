import { checkMissing } from "@/domain/rules/missing";
import { checkDryBed } from "@/domain/rules/dry-bed";
import { checkObservedTime } from "@/domain/rules/observed-time";
import { checkLocation } from "@/domain/rules/location";
import type { RuleInput, RuleResult } from "@/domain/rules/types";

export type { RuleInput, RuleResult, Severity, SuggestionInfo } from "@/domain/rules/types";

/** Run every rule in a stable order and return all findings. */
export function runAllRules(input: RuleInput, now: Date = new Date()): RuleResult[] {
  return [
    ...checkMissing(input),
    ...checkDryBed(input),
    ...checkObservedTime(input, now),
    ...checkLocation(input),
  ];
}
