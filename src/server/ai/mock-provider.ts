/**
 * Deterministic mock provider for tests and offline dev (Section 15.2).
 * Never performs a live call. Returns varied fixtures including one
 * abstention and one low-confidence case.
 *
 * NOTE: two rows are deliberately non-compliant to exercise `normalize.ts`
 * end to end: `odor` carries a guessed value (must become
 * `cannot_determine`) and `litter` carries an invalid value with an
 * out-of-range confidence (must become `cannot_determine`, band `none`).
 */
import type { AssessmentProvider, RawSuggestResult } from "@/server/ai/provider";

export const MOCK_MODEL = "mock-1";

export class MockProvider implements AssessmentProvider {
  readonly name = "mock" as const;
  readonly model = MOCK_MODEL;

  // No input parameter: the fixture is fully deterministic. Callers use
  // the AssessmentProvider interface, so this stays assignable.
  async suggest(): Promise<RawSuggestResult> {
    return {
      image_quality: "ok",
      indicators: [
        {
          indicator: "clarity",
          value: "cloudy",
          confidence: 0.7,
          evidence: "Water has a uniform grey-brown haze; the streambed is not visible.",
          visible_cues: ["uniform haze", "no visible streambed"],
        },
        {
          indicator: "color",
          value: "brown",
          confidence: 0.4,
          evidence: "Brown tint across the frame.",
          visible_cues: ["brown tint"],
        },
        {
          indicator: "algae",
          value: "patches",
          confidence: 0.85,
          evidence: "Small green patches float near the bank.",
          visible_cues: ["green patches"],
        },
        {
          indicator: "litter",
          value: "everywhere",
          confidence: 1.5,
          evidence: "Scattered debris along the bank.",
          visible_cues: ["debris"],
        },
        {
          indicator: "flow",
          value: "cannot_determine",
          confidence: 0,
          evidence: "A still photo cannot show movement reliably.",
          visible_cues: [],
        },
        {
          indicator: "odor",
          value: "earthy",
          confidence: 0.9,
          evidence: "Smells earthy.",
          visible_cues: [],
        },
      ],
    };
  }
}
