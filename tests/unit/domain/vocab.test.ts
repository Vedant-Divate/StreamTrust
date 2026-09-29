import { describe, expect, it } from "vitest";
import {
  INDICATOR_CODES,
  INDICATOR_MAP,
  INDICATORS,
  NOT_APPLICABLE,
  NOT_APPLICABLE_INDICATORS,
  RAIN_LAST_24H_CODES,
  RAIN_LAST_24H_OPTIONS,
  getIndicator,
  getIndicatorValue,
  isValidFinalValue,
} from "@/domain/vocab";

describe("indicator vocabulary completeness", () => {
  it("defines exactly the six indicators from PROJECT.md Section 7.1", () => {
    expect([...INDICATOR_CODES]).toEqual(["clarity", "color", "algae", "litter", "flow", "odor"]);
    expect(INDICATORS).toHaveLength(6);
  });

  it("gives every indicator a plain label and a scientific term", () => {
    for (const def of INDICATORS) {
      expect(def.label.trim().length).toBeGreaterThan(0);
      expect(def.scientificTerm.trim().length).toBeGreaterThan(0);
      expect(def.values.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives every value a unique non-empty code, label and help text", () => {
    for (const def of INDICATORS) {
      const codes = def.values.map((v) => v.code);
      expect(new Set(codes).size).toBe(codes.length);
      for (const v of def.values) {
        expect(v.code.trim().length).toBeGreaterThan(0);
        expect(v.label.trim().length).toBeGreaterThan(0);
        expect(v.helpText.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("lets the AI suggest every indicator except odor", () => {
    for (const def of INDICATORS) {
      expect(def.aiMaySuggest).toBe(def.code !== "odor");
    }
  });

  it("covers the rain context field", () => {
    expect([...RAIN_LAST_24H_CODES]).toEqual(["none", "light", "heavy", "unknown"]);
    expect(RAIN_LAST_24H_OPTIONS).toHaveLength(4);
    for (const o of RAIN_LAST_24H_OPTIONS) {
      expect(o.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("not_applicable handling", () => {
  it("restricts not_applicable to the four water-appearance indicators", () => {
    expect([...NOT_APPLICABLE_INDICATORS]).toEqual(["clarity", "color", "algae", "odor"]);
    expect(isValidFinalValue("clarity", NOT_APPLICABLE, "dry")).toBe(true);
    expect(isValidFinalValue("odor", NOT_APPLICABLE, "dry")).toBe(true);
    expect(isValidFinalValue("flow", NOT_APPLICABLE, "dry")).toBe(false);
    expect(isValidFinalValue("litter", NOT_APPLICABLE, "dry")).toBe(false);
  });

  it("allows not_applicable only when flow is dry", () => {
    expect(isValidFinalValue("clarity", NOT_APPLICABLE, "dry")).toBe(true);
    expect(isValidFinalValue("clarity", NOT_APPLICABLE, "slow")).toBe(false);
    expect(isValidFinalValue("clarity", NOT_APPLICABLE, undefined)).toBe(false);
  });

  it("accepts ordinary values and rejects unknown codes", () => {
    expect(isValidFinalValue("clarity", "muddy", "slow")).toBe(true);
    expect(isValidFinalValue("odor", "sewage_like")).toBe(true);
    expect(isValidFinalValue("clarity", "purple", "slow")).toBe(false);
    expect(isValidFinalValue("flow", "clear")).toBe(false);
  });
});

describe("vocab lookups", () => {
  it("resolves indicators and values by code", () => {
    expect(getIndicator("flow")?.scientificTerm).toBe("Flow regime");
    expect(getIndicator("nope")).toBeUndefined();
    expect(getIndicatorValue("algae", "heavy")?.label).toBe("Covers a lot");
    expect(getIndicatorValue("algae", NOT_APPLICABLE)?.code).toBe(NOT_APPLICABLE);
    expect(getIndicatorValue("flow", NOT_APPLICABLE)).toBeUndefined();
    expect(INDICATOR_MAP.odor.aiMaySuggest).toBe(false);
  });
});
