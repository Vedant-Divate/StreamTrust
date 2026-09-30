import type { RuleResult, RuleInput } from "@/domain/rules/types";

/** R-LOCATION: a usable stream location is required. */
export function checkLocation(input: RuleInput): RuleResult[] {
  const site = input.site;
  const valid =
    site !== null &&
    Number.isFinite(site.lat) &&
    Number.isFinite(site.lng) &&
    site.lat >= -90 &&
    site.lat <= 90 &&
    site.lng >= -180 &&
    site.lng <= 180;
  if (valid) return [];
  return [
    {
      ruleId: "R-LOCATION",
      severity: "error",
      indicators: [],
      message: "Please set the stream location.",
    },
  ];
}
