import type { RuleResult, RuleInput } from "@/domain/rules/types";

/** R-NO-PHOTO: photos help reviewers; a waiver records going without. */
export function checkNoPhoto(input: RuleInput): RuleResult[] {
  if (input.photoCount > 0 || input.photoWaiver) return [];
  return [
    {
      ruleId: "R-NO-PHOTO",
      severity: "warning",
      indicators: [],
      message: "Photos help reviewers trust your record. Add one or continue without.",
    },
  ];
}
