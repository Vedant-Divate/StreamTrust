import type { RuleResult, RuleInput } from "@/domain/rules/types";

function smellClean(input: RuleInput): RuleResult[] {
  const { entries } = input;
  if (
    (entries.odor === "sewage_like" || entries.odor === "chemical_like") &&
    entries.clarity === "clear" &&
    entries.litter === "none" &&
    entries.algae === "none"
  ) {
    return [
      {
        ruleId: "R-SMELL-CLEAN",
        severity: "warning",
        indicators: ["odor", "clarity", "litter", "algae"],
        message: "You noted a strong smell but everything else looks clean. Double-check?",
      },
    ];
  }
  return [];
}

function clearHeavyAlgae(input: RuleInput): RuleResult[] {
  if (input.entries.clarity === "clear" && input.entries.algae === "heavy") {
    return [
      {
        ruleId: "R-CLEAR-HEAVYALGAE",
        severity: "warning",
        indicators: ["clarity", "algae"],
        message: "Water is 'clear' but heavily covered in green growth. Is that right?",
      },
    ];
  }
  return [];
}

function colorClarity(input: RuleInput): RuleResult[] {
  if (input.entries.color === "brown" && input.entries.clarity === "clear") {
    return [
      {
        ruleId: "R-COLOR-CLARITY",
        severity: "warning",
        indicators: ["color", "clarity"],
        message: "You picked brown-tinted water but also 'clear'.",
      },
    ];
  }
  return [];
}

/** Consistency warnings (R-SMELL-CLEAN, R-CLEAR-HEAVYALGAE, R-COLOR-CLARITY). */
export function checkConsistency(input: RuleInput): RuleResult[] {
  return [...smellClean(input), ...clearHeavyAlgae(input), ...colorClarity(input)];
}
