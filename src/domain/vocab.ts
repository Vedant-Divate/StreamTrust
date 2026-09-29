/**
 * Stream indicator vocabulary — the single source of truth for indicator
 * codes, values, plain-language labels, scientific terms, and whether the
 * AI may suggest a value (PROJECT.md Section 7.1).
 *
 * Pure domain module: no imports from `src/server/**` or `src/app/**`.
 */

export const INDICATOR_CODES = ["clarity", "color", "algae", "litter", "flow", "odor"] as const;

export type IndicatorCode = (typeof INDICATOR_CODES)[number];

export interface IndicatorValue {
  code: string;
  label: string;
  /** One sentence, plain language, no jargon. */
  helpText: string;
}

export interface IndicatorDef {
  code: IndicatorCode;
  /** Plain-language question shown to the volunteer. */
  label: string;
  /** Scientific term shown inside tooltips only. */
  scientificTerm: string;
  values: IndicatorValue[];
  /** False for `odor`: the AI must always abstain on smell. */
  aiMaySuggest: boolean;
}

/**
 * Special value used when the human selects `flow=dry`. Allowed only for
 * clarity, color, algae and odor, and only when `flow` is `dry`.
 * The AI never suggests it.
 */
export const NOT_APPLICABLE = "not_applicable";

export const NOT_APPLICABLE_VALUE: IndicatorValue = {
  code: NOT_APPLICABLE,
  label: "Not applicable",
  helpText: "There is no water to describe because the stream bed is dry.",
};

export const NOT_APPLICABLE_INDICATORS: readonly IndicatorCode[] = [
  "clarity",
  "color",
  "algae",
  "odor",
];

export const INDICATORS: readonly IndicatorDef[] = [
  {
    code: "clarity",
    label: "How clear is the water?",
    scientificTerm: "Turbidity",
    aiMaySuggest: true,
    values: [
      { code: "clear", label: "Clear", helpText: "You can see through the water easily." },
      {
        code: "slightly_cloudy",
        label: "Slightly cloudy",
        helpText: "The water looks a little hazy.",
      },
      { code: "cloudy", label: "Cloudy", helpText: "You cannot see through the water." },
      {
        code: "muddy",
        label: "Muddy or opaque",
        helpText: "The water looks thick with mud, often after rain.",
      },
    ],
  },
  {
    code: "color",
    label: "What colour is the water?",
    scientificTerm: "Water colour / possible algal pigments",
    aiMaySuggest: true,
    values: [
      {
        code: "colorless",
        label: "No noticeable colour",
        helpText: "The water has no real colour of its own.",
      },
      {
        code: "green",
        label: "Green tint",
        helpText: "The water looks green, which can mean tiny floating plants.",
      },
      {
        code: "brown",
        label: "Brown or tea tint",
        helpText: "The water looks brown like tea, often from soil or leaves.",
      },
      {
        code: "unusual",
        label: "Unusual colour",
        helpText: "Milky, orange, black, or any colour that looks out of place.",
      },
    ],
  },
  {
    code: "algae",
    label: "Green film or growth on the surface?",
    scientificTerm: "Algal cover",
    aiMaySuggest: true,
    values: [
      { code: "none", label: "None", helpText: "No green film or growth on the water." },
      {
        code: "patches",
        label: "Some patches",
        helpText: "You can see small spots of green film or growth.",
      },
      {
        code: "heavy",
        label: "Covers a lot",
        helpText: "Green film or growth covers much of the surface.",
      },
    ],
  },
  {
    code: "litter",
    label: "Litter or debris visible?",
    scientificTerm: "Anthropogenic debris",
    aiMaySuggest: true,
    values: [
      { code: "none", label: "None", helpText: "You cannot see any litter or rubbish." },
      { code: "some", label: "A little", helpText: "You can see one or two pieces of litter." },
      { code: "a_lot", label: "A lot", helpText: "Litter is easy to see in many places." },
    ],
  },
  {
    code: "flow",
    label: "How is the water moving?",
    scientificTerm: "Flow regime",
    aiMaySuggest: true,
    values: [
      { code: "dry", label: "No water", helpText: "The stream bed is dry." },
      { code: "standing", label: "Still", helpText: "The water is not moving." },
      { code: "slow", label: "Slow", helpText: "The water moves gently." },
      { code: "moderate", label: "Moderate", helpText: "The water moves at a steady pace." },
      { code: "fast", label: "Fast", helpText: "The water rushes past quickly." },
    ],
  },
  {
    code: "odor",
    label: "Does it smell?",
    scientificTerm: "Odour (sensory indicator)",
    aiMaySuggest: false,
    values: [
      { code: "none", label: "No smell", helpText: "You cannot smell anything unusual." },
      { code: "earthy", label: "Earthy or musty", helpText: "It smells like soil after rain." },
      {
        code: "sewage_like",
        label: "Sewage-like",
        helpText: "It smells like a blocked toilet or drain.",
      },
      {
        code: "chemical_like",
        label: "Chemical-like",
        helpText: "It smells sharp, like fuel, paint, or cleaning products.",
      },
    ],
  },
];

export const INDICATOR_MAP: Record<IndicatorCode, IndicatorDef> = Object.fromEntries(
  INDICATORS.map((d) => [d.code, d])
) as Record<IndicatorCode, IndicatorDef>;

/** Context field (not an indicator): rain in the last 24 hours. */
export const RAIN_LAST_24H_CODES = ["none", "light", "heavy", "unknown"] as const;

export type RainLast24h = (typeof RAIN_LAST_24H_CODES)[number];

export const RAIN_LAST_24H_OPTIONS: readonly IndicatorValue[] = [
  { code: "none", label: "No rain", helpText: "It has not rained in the last day." },
  { code: "light", label: "Light rain", helpText: "There was a little rain in the last day." },
  { code: "heavy", label: "Heavy rain", helpText: "There was a lot of rain in the last day." },
  { code: "unknown", label: "Don't know", helpText: "You are not sure if it rained." },
];

export function getIndicator(code: string): IndicatorDef | undefined {
  return (INDICATOR_MAP as Record<string, IndicatorDef>)[code];
}

export function getIndicatorValue(
  indicator: IndicatorCode,
  valueCode: string
): IndicatorValue | undefined {
  if (valueCode === NOT_APPLICABLE) {
    return NOT_APPLICABLE_INDICATORS.includes(indicator) ? NOT_APPLICABLE_VALUE : undefined;
  }
  return INDICATOR_MAP[indicator].values.find((v) => v.code === valueCode);
}

/**
 * Whether a final human value is structurally allowed. `not_applicable` is
 * allowed only for the four water-appearance indicators and only when the
 * recorded flow value is `dry`.
 */
export function isValidFinalValue(
  indicator: IndicatorCode,
  valueCode: string,
  flowValue?: string
): boolean {
  if (valueCode === NOT_APPLICABLE) {
    return NOT_APPLICABLE_INDICATORS.includes(indicator) && flowValue === "dry";
  }
  return INDICATOR_MAP[indicator].values.some((v) => v.code === valueCode);
}
