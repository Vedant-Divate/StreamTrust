import { checkMissing } from "@/domain/rules/missing";
import { checkDryBed } from "@/domain/rules/dry-bed";
import { checkObservedTime } from "@/domain/rules/observed-time";
import { checkLocation } from "@/domain/rules/location";
import { checkConsistency } from "@/domain/rules/consistency";
import { checkInfo } from "@/domain/rules/informational";
import { checkNoPhoto } from "@/domain/rules/photos";
import type { RuleInput, RuleResult } from "@/domain/rules/types";

export type { RuleInput, RuleResult, Severity, SuggestionInfo } from "@/domain/rules/types";

/** Every rule ID the engine can emit (used to validate ack payloads). */
export const KNOWN_RULE_IDS = [
  "R-MISSING",
  "R-DRY-WATER",
  "R-NA-WITHOUT-DRY",
  "R-FUTURE-TIME",
  "R-LOCATION",
  "R-SMELL-CLEAN",
  "R-CLEAR-HEAVYALGAE",
  "R-COLOR-CLARITY",
  "R-MUDDY-RAIN",
  "R-AI-OVERRIDE-HIGH",
  "R-NO-PHOTO",
] as const;

/** Run every rule in a stable order and return all findings. */
export function runAllRules(input: RuleInput, now: Date = new Date()): RuleResult[] {
  return [
    ...checkMissing(input),
    ...checkDryBed(input),
    ...checkObservedTime(input, now),
    ...checkLocation(input),
    ...checkConsistency(input),
    ...checkInfo(input),
    ...checkNoPhoto(input),
  ];
}
