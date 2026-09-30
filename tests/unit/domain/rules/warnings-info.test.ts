import { describe, expect, it } from "vitest";
import { checkConsistency } from "@/domain/rules/consistency";
import { checkInfo } from "@/domain/rules/informational";
import { checkNoPhoto } from "@/domain/rules/photos";
import { runAllRules } from "@/domain/rules/index";
import type { RuleInput } from "@/domain/rules/types";

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

describe("R-SMELL-CLEAN", () => {
  const smelly = {
    odor: "sewage_like",
    clarity: "clear",
    litter: "none",
    algae: "none",
  } as const;

  it("fires on strong smell with otherwise clean water", () => {
    const results = checkConsistency(baseInput({ entries: { ...baseInput().entries, ...smelly } }));
    expect(results).toMatchObject([{ ruleId: "R-SMELL-CLEAN", severity: "warning" }]);
  });

  it("fires for chemical smells too", () => {
    const results = checkConsistency(
      baseInput({ entries: { ...baseInput().entries, ...smelly, odor: "chemical_like" } })
    );
    expect(results.map((r) => r.ruleId)).toContain("R-SMELL-CLEAN");
  });

  it("stays quiet for earthy smells or dirty-looking water", () => {
    expect(
      checkConsistency(
        baseInput({ entries: { ...baseInput().entries, ...smelly, odor: "earthy" } })
      )
    ).toEqual([]);
    expect(
      checkConsistency(
        baseInput({ entries: { ...baseInput().entries, ...smelly, clarity: "muddy" } })
      )
    ).toEqual([]);
  });
});

describe("R-CLEAR-HEAVYALGAE", () => {
  it("fires on clear water with heavy cover", () => {
    expect(
      checkConsistency(baseInput({ entries: { ...baseInput().entries, algae: "heavy" } }))
    ).toMatchObject([{ ruleId: "R-CLEAR-HEAVYALGAE", severity: "warning" }]);
  });

  it("stays quiet when either side differs", () => {
    expect(
      checkConsistency(baseInput({ entries: { ...baseInput().entries, algae: "patches" } }))
    ).toEqual([]);
  });
});

describe("R-COLOR-CLARITY", () => {
  it("fires on brown yet clear", () => {
    expect(
      checkConsistency(baseInput({ entries: { ...baseInput().entries, color: "brown" } }))
    ).toMatchObject([{ ruleId: "R-COLOR-CLARITY", severity: "warning" }]);
  });

  it("stays quiet for consistent pairs", () => {
    expect(
      checkConsistency(
        baseInput({ entries: { ...baseInput().entries, color: "brown", clarity: "muddy" } })
      )
    ).toEqual([]);
  });
});

describe("R-MUDDY-RAIN", () => {
  it("fires for muddy water after light or heavy rain", () => {
    for (const rain of ["light", "heavy"]) {
      expect(
        checkInfo(
          baseInput({ entries: { ...baseInput().entries, clarity: "muddy" }, rainLast24h: rain })
        )
      ).toMatchObject([{ ruleId: "R-MUDDY-RAIN", severity: "info" }]);
    }
  });

  it("stays quiet without rain or without mud", () => {
    expect(
      checkInfo(
        baseInput({ entries: { ...baseInput().entries, clarity: "muddy" }, rainLast24h: "none" })
      )
    ).toEqual([]);
    expect(checkInfo(baseInput())).toEqual([]);
  });
});

describe("R-AI-OVERRIDE-HIGH", () => {
  const suggestions = {
    clarity: { suggestedValue: "cloudy", confidenceBand: "high" },
  };

  it("fires when a high-confidence suggestion was changed", () => {
    const results = checkInfo(
      baseInput({
        entries: { ...baseInput().entries, clarity: "muddy" },
        suggestions,
      })
    );
    expect(results).toMatchObject([
      { ruleId: "R-AI-OVERRIDE-HIGH", severity: "info", indicators: ["clarity"] },
    ]);
  });

  it("stays quiet on accept, abstention, or lower bands", () => {
    const accepted = checkInfo(
      baseInput({
        entries: { ...baseInput().entries, clarity: "cloudy" },
        suggestions,
      })
    );
    expect(accepted).toEqual([]);
    const abstained = checkInfo(
      baseInput({
        entries: { ...baseInput().entries, clarity: "muddy" },
        suggestions: { clarity: { suggestedValue: "cannot_determine", confidenceBand: "high" } },
      })
    );
    expect(abstained).toEqual([]);
    const medium = checkInfo(
      baseInput({
        entries: { ...baseInput().entries, clarity: "muddy" },
        suggestions: { clarity: { suggestedValue: "cloudy", confidenceBand: "medium" } },
      })
    );
    expect(medium).toEqual([]);
  });
});

describe("R-NO-PHOTO", () => {
  it("fires with no photos and no waiver", () => {
    expect(checkNoPhoto(baseInput({ photoCount: 0 }))).toMatchObject([
      { ruleId: "R-NO-PHOTO", severity: "warning" },
    ]);
  });

  it("stays quiet with photos or with a waiver", () => {
    expect(checkNoPhoto(baseInput())).toEqual([]);
    expect(checkNoPhoto(baseInput({ photoCount: 0, photoWaiver: true }))).toEqual([]);
  });
});

describe("runAllRules severities", () => {
  const now = new Date("2026-09-30T12:00:00.000Z");
  const answered = {
    clarity: "clear",
    color: "colorless",
    algae: "none",
    litter: "none",
    flow: "slow",
    odor: "sewage_like",
  };

  it("returns warnings in stable order", () => {
    const results = runAllRules(baseInput({ entries: answered }), now);
    expect(results.map((r) => r.ruleId)).toEqual(["R-SMELL-CLEAN"]);
  });

  it("returns multiple warnings in rule order", () => {
    const results = runAllRules(baseInput({ entries: { ...answered, color: "brown" } }), now);
    expect(results.map((r) => r.ruleId)).toEqual(["R-SMELL-CLEAN", "R-COLOR-CLARITY"]);
  });
});
