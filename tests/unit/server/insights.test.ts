import { describe, expect, it } from "vitest";
import { computeAgreement, type InsightRow } from "@/server/insights/aggregate";

function row(partial: Partial<InsightRow> & { indicator: string }): InsightRow {
  return {
    finalValue: "clear",
    decisionSource: "human_only",
    suggestedValue: null,
    confidenceBand: null,
    isDemo: false,
    ...partial,
  };
}

describe("computeAgreement", () => {
  it("computes overall rate from known rows", () => {
    const rows = [
      row({
        indicator: "clarity",
        finalValue: "cloudy",
        suggestedValue: "cloudy",
        confidenceBand: "medium",
        decisionSource: "ai_accepted",
      }),
      row({
        indicator: "color",
        finalValue: "green",
        suggestedValue: "brown",
        confidenceBand: "low",
        decisionSource: "human_override",
      }),
      row({
        indicator: "algae",
        finalValue: "none",
        suggestedValue: "none",
        confidenceBand: "high",
        decisionSource: "ai_accepted",
      }),
      // Abstained suggestion: not a pair.
      row({
        indicator: "odor",
        finalValue: "earthy",
        suggestedValue: "cannot_determine",
        confidenceBand: "none",
      }),
      // No suggestion at all: not a pair, but an override source is impossible here.
      row({ indicator: "flow", finalValue: "slow" }),
    ];
    const summary = computeAgreement(rows);
    expect(summary.pairs).toBe(3);
    expect(summary.agreed).toBe(2);
    expect(summary.rate).toBe(66.7);
    expect(summary.overrides).toBe(1);
  });

  it("returns null rates with zero pairs", () => {
    const summary = computeAgreement([row({ indicator: "odor", finalValue: "none" })]);
    expect(summary).toMatchObject({ pairs: 0, agreed: 0, rate: null, overrides: 0 });
    expect(summary.byIndicator).toEqual([]);
    expect(summary.byBand).toEqual([]);
  });

  it("breaks down per indicator with override counts", () => {
    const rows = [
      row({
        indicator: "clarity",
        finalValue: "muddy",
        suggestedValue: "cloudy",
        confidenceBand: "high",
        decisionSource: "human_override",
      }),
      row({
        indicator: "clarity",
        finalValue: "clear",
        suggestedValue: "clear",
        confidenceBand: "high",
        decisionSource: "ai_accepted",
      }),
      row({
        indicator: "color",
        finalValue: "green",
        suggestedValue: "brown",
        confidenceBand: "low",
        decisionSource: "human_override",
      }),
    ];
    const { byIndicator } = computeAgreement(rows);
    expect(byIndicator).toEqual([
      { indicator: "clarity", pairs: 2, agreed: 1, rate: 50, overrides: 1 },
      { indicator: "color", pairs: 1, agreed: 0, rate: 0, overrides: 1 },
    ]);
  });

  it("cross-tabulates bands against agreement", () => {
    const rows = [
      row({ indicator: "a", finalValue: "x", suggestedValue: "x", confidenceBand: "high" }),
      row({ indicator: "b", finalValue: "y", suggestedValue: "z", confidenceBand: "high" }),
      row({ indicator: "c", finalValue: "x", suggestedValue: "x", confidenceBand: "low" }),
    ];
    const { byBand } = computeAgreement(rows);
    expect(byBand).toEqual([
      { band: "high", pairs: 2, agreed: 1, rate: 50 },
      { band: "low", pairs: 1, agreed: 1, rate: 100 },
    ]);
  });
});
