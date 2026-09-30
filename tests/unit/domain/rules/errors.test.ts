import { describe, expect, it } from "vitest";
import type { IndicatorCode } from "@/domain/vocab";
import { checkDryBed } from "@/domain/rules/dry-bed";
import { checkLocation } from "@/domain/rules/location";
import { checkMissing } from "@/domain/rules/missing";
import { FUTURE_SKEW_MS, checkObservedTime } from "@/domain/rules/observed-time";
import { runAllRules } from "@/domain/rules/index";
import type { RuleInput } from "@/domain/rules/types";

const NOW = new Date("2026-09-30T12:00:00.000Z");

function baseInput(overrides: Partial<RuleInput> = {}): RuleInput {
  return {
    entries: {
      clarity: "clear",
      color: "colorless",
      algae: "none",
      litter: "none",
      flow: "slow",
      odor: "none",
    },
    rainLast24h: "none",
    observedAt: "2026-09-30T11:00:00.000Z",
    site: { lat: 12.9716, lng: 77.5946 },
    photoCount: 1,
    photoWaiver: false,
    suggestions: {},
    ...overrides,
  };
}

describe("R-MISSING", () => {
  it("fires listing every unanswered indicator", () => {
    const results = checkMissing(baseInput({ entries: { clarity: "clear" } }));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ ruleId: "R-MISSING", severity: "error" });
    expect(results[0].indicators).toEqual(
      expect.arrayContaining(["color", "algae", "litter", "flow", "odor"])
    );
    expect(results[0].indicators).not.toContain("clarity");
  });

  it("stays quiet when all six are answered", () => {
    expect(checkMissing(baseInput())).toEqual([]);
  });
});

describe("R-DRY-WATER", () => {
  it("fires when flow is dry but appearance values are set", () => {
    const results = checkDryBed(
      baseInput({
        entries: {
          flow: "dry",
          clarity: "clear",
          color: "brown",
          algae: "none",
          litter: "none",
          odor: "none",
        },
      })
    );
    const dry = results.find((r) => r.ruleId === "R-DRY-WATER")!;
    expect(dry.severity).toBe("error");
    expect(dry.indicators).toEqual(expect.arrayContaining(["clarity", "color"]));
  });

  it("stays quiet for a consistent dry bed", () => {
    const results = checkDryBed(
      baseInput({
        entries: {
          flow: "dry",
          clarity: "not_applicable",
          color: "not_applicable",
          algae: "not_applicable",
          litter: "some",
          odor: "not_applicable",
        },
      })
    );
    expect(results).toEqual([]);
  });

  it("does not apply when there is water", () => {
    expect(
      checkDryBed(baseInput({ entries: { flow: "slow", clarity: "clear" } })).find(
        (r) => r.ruleId === "R-DRY-WATER"
      )
    ).toBeUndefined();
  });
});

describe("R-NA-WITHOUT-DRY", () => {
  it("fires on stale not_applicable left by a direct API call", () => {
    // Bypasses the wizard N/A cascade: flow changed, clarity stayed N/A.
    const results = checkDryBed(
      baseInput({ entries: { flow: "slow", clarity: "not_applicable" } })
    );
    const na = results.find((r) => r.ruleId === "R-NA-WITHOUT-DRY")!;
    expect(na).toMatchObject({ severity: "error", indicators: ["clarity"] });
  });

  it("fires when flow itself is unanswered", () => {
    const entries = { clarity: "not_applicable" } as Record<IndicatorCode, string>;
    const results = checkDryBed(baseInput({ entries }));
    expect(results.find((r) => r.ruleId === "R-NA-WITHOUT-DRY")).toBeDefined();
  });

  it("stays quiet without any not_applicable", () => {
    expect(checkDryBed(baseInput())).toEqual([]);
  });
});

describe("R-FUTURE-TIME", () => {
  it("fires well beyond the skew window", () => {
    const results = checkObservedTime(baseInput({ observedAt: "2026-09-30T13:00:00.000Z" }), NOW);
    expect(results).toMatchObject([{ ruleId: "R-FUTURE-TIME", severity: "error" }]);
  });

  it("stays quiet for past times", () => {
    expect(checkObservedTime(baseInput(), NOW)).toEqual([]);
  });

  it("tolerates exactly the 5-minute skew, fires a second later", () => {
    const edge = new Date(NOW.getTime() + FUTURE_SKEW_MS).toISOString();
    expect(checkObservedTime(baseInput({ observedAt: edge }), NOW)).toEqual([]);
    const over = new Date(NOW.getTime() + FUTURE_SKEW_MS + 1000).toISOString();
    expect(checkObservedTime(baseInput({ observedAt: over }), NOW)).toMatchObject([
      { ruleId: "R-FUTURE-TIME" },
    ]);
  });
});

describe("R-LOCATION", () => {
  it("fires when the site is missing", () => {
    expect(checkLocation(baseInput({ site: null }))).toMatchObject([
      { ruleId: "R-LOCATION", severity: "error" },
    ]);
  });

  it("fires outside valid ranges, accepts the boundaries", () => {
    expect(checkLocation(baseInput({ site: { lat: 91, lng: 0 } }))).toMatchObject([
      { ruleId: "R-LOCATION" },
    ]);
    expect(checkLocation(baseInput({ site: { lat: 0, lng: -181 } }))).toMatchObject([
      { ruleId: "R-LOCATION" },
    ]);
    expect(checkLocation(baseInput({ site: { lat: -90, lng: 180 } }))).toEqual([]);
  });
});

describe("runAllRules", () => {
  it("collects every error in stable order", () => {
    const results = runAllRules(
      baseInput({
        entries: { clarity: "clear" },
        observedAt: "2026-09-30T13:00:00.000Z",
        site: null,
      }),
      NOW
    );
    expect(results.map((r) => r.ruleId)).toEqual(["R-MISSING", "R-FUTURE-TIME", "R-LOCATION"]);
  });
});
