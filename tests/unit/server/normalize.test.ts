import { describe, expect, it } from "vitest";
import {
  CANNOT_DETERMINE,
  MAX_EVIDENCE_LENGTH,
  confidenceToBand,
  normalizeSuggestions,
} from "@/server/ai/normalize";
import { MockProvider } from "@/server/ai/mock-provider";

describe("confidence bands (Section 8.5)", () => {
  it("maps the documented thresholds", () => {
    expect(confidenceToBand(0)).toBe("low");
    expect(confidenceToBand(0.49)).toBe("low");
    expect(confidenceToBand(0.5)).toBe("medium");
    expect(confidenceToBand(0.79)).toBe("medium");
    expect(confidenceToBand(0.8)).toBe("high");
    expect(confidenceToBand(1)).toBe("high");
  });
});

describe("normalizeSuggestions with a deliberately non-compliant payload", () => {
  const raw = {
    image_quality: "ok",
    indicators: [
      {
        indicator: "clarity",
        value: "cloudy",
        confidence: 0.7,
        evidence: "Haze.",
        visible_cues: ["haze"],
      },
      // Odor guess with HIGH confidence: must still abstain.
      {
        indicator: "odor",
        value: "earthy",
        confidence: 0.95,
        evidence: "Smells earthy.",
        visible_cues: ["smell"],
      },
      // Invalid value code.
      {
        indicator: "litter",
        value: "everywhere",
        confidence: 0.6,
        evidence: "Debris.",
        visible_cues: [],
      },
      // Forbidden not_applicable from the model.
      {
        indicator: "algae",
        value: "not_applicable",
        confidence: 0.9,
        evidence: "x",
        visible_cues: [],
      },
      // Out-of-range and non-numeric confidences get clamped.
      { indicator: "color", value: "brown", confidence: 1.5, evidence: "Brown.", visible_cues: [] },
      { indicator: "flow", value: "slow", confidence: -0.2, evidence: "Slow.", visible_cues: [] },
      // Unknown indicator is dropped (nowhere to store it).
      { indicator: "fish", value: "many", confidence: 0.9, evidence: "Fish.", visible_cues: [] },
      // Over-long evidence is truncated.
      {
        indicator: "litter",
        value: "some",
        confidence: 0.6,
        evidence: "x".repeat(500),
        visible_cues: ["a", 42, null],
      },
    ],
  };

  it("forces odor to abstain no matter what the model says", () => {
    const odor = normalizeSuggestions(raw).find((s) => s.indicator === "odor")!;
    expect(odor).toMatchObject({
      suggestedValue: CANNOT_DETERMINE,
      confidenceBand: "none",
      confidenceScore: null,
      evidence: "",
      cues: [],
    });
  });

  it("abstains on invalid and forbidden values", () => {
    const byIndicator = Object.fromEntries(normalizeSuggestions(raw).map((s) => [s.indicator, s]));
    expect(byIndicator.litter.suggestedValue).toBe("some");
    expect(byIndicator.algae).toMatchObject({
      suggestedValue: CANNOT_DETERMINE,
      confidenceBand: "none",
    });
  });

  it("clamps confidence into [0,1] and bands it", () => {
    const byIndicator = Object.fromEntries(normalizeSuggestions(raw).map((s) => [s.indicator, s]));
    expect(byIndicator.color).toMatchObject({ confidenceScore: 1, confidenceBand: "high" });
    expect(byIndicator.flow).toMatchObject({ confidenceScore: 0, confidenceBand: "low" });
  });

  it("drops unknown indicators and truncates evidence", () => {
    const out = normalizeSuggestions(raw);
    expect(out.find((s) => (s.indicator as string) === "fish")).toBeUndefined();
    const litter = out.filter((s) => s.indicator === "litter");
    expect(litter).toHaveLength(2);
    const truncated = litter.find((s) => s.suggestedValue === "some")!;
    expect(truncated.evidence).toHaveLength(MAX_EVIDENCE_LENGTH);
    expect(truncated.cues).toEqual(["a"]);
  });

  it("passes a compliant row through untouched", () => {
    const clarity = normalizeSuggestions(raw).find((s) => s.indicator === "clarity")!;
    expect(clarity).toEqual({
      indicator: "clarity",
      suggestedValue: "cloudy",
      confidenceBand: "medium",
      confidenceScore: 0.7,
      evidence: "Haze.",
      cues: ["haze"],
    });
  });

  it("rejects malformed payloads with an empty list", () => {
    expect(normalizeSuggestions(null)).toEqual([]);
    expect(normalizeSuggestions({})).toEqual([]);
    expect(normalizeSuggestions({ indicators: "nope" })).toEqual([]);
  });
});

describe("normalizeSuggestions with the mock provider", () => {
  it("yields the full indicator set with enforced abstentions", async () => {
    const raw = await new MockProvider().suggest();
    const out = normalizeSuggestions(raw);
    expect(out).toHaveLength(6);
    const byIndicator = Object.fromEntries(out.map((s) => [s.indicator, s]));
    expect(byIndicator.odor.suggestedValue).toBe(CANNOT_DETERMINE);
    expect(byIndicator.litter.suggestedValue).toBe(CANNOT_DETERMINE);
    expect(byIndicator.flow.suggestedValue).toBe(CANNOT_DETERMINE);
    expect(byIndicator.color.confidenceBand).toBe("low");
    expect(byIndicator.clarity.suggestedValue).toBe("cloudy");
  });
});
