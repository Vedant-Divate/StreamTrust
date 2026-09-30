import type { RuleResult, RuleInput } from "@/domain/rules/types";

// Abstention sentinel, repeated as a literal: domain code must not import
// from src/server/**, and normalize.ts remains the source of truth that
// produces it (same pattern as AiSuggestionPanel).
const ABSTAINED = "cannot_determine";

function muddyRain(input: RuleInput): RuleResult[] {
  if (
    input.entries.clarity === "muddy" &&
    (input.rainLast24h === "light" || input.rainLast24h === "heavy")
  ) {
    return [
      {
        ruleId: "R-MUDDY-RAIN",
        severity: "info",
        indicators: ["clarity"],
        message: "Muddy water after rain is common. Add a note if you like.",
      },
    ];
  }
  return [];
}

function aiOverrideHigh(input: RuleInput): RuleResult[] {
  const overridden = Object.entries(input.suggestions)
    .filter(
      ([indicator, s]) =>
        s.confidenceBand === "high" &&
        s.suggestedValue !== ABSTAINED &&
        input.entries[indicator as keyof typeof input.entries] !== undefined &&
        input.entries[indicator as keyof typeof input.entries] !== s.suggestedValue
    )
    .map(([indicator]) => indicator);
  if (overridden.length === 0) return [];
  return [
    {
      ruleId: "R-AI-OVERRIDE-HIGH",
      severity: "info",
      indicators: overridden,
      message: "You changed a high-confidence AI suggestion — please add a short note.",
    },
  ];
}

/** Informational rules (R-MUDDY-RAIN, R-AI-OVERRIDE-HIGH). Never block. */
export function checkInfo(input: RuleInput): RuleResult[] {
  return [...muddyRain(input), ...aiOverrideHigh(input)];
}
