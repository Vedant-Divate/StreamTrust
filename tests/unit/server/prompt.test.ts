import { describe, expect, it } from "vitest";
import { PROMPT_VERSION, SYSTEM_PROMPT } from "@/server/ai/prompt";

describe("v1 system prompt", () => {
  it("is versioned", () => {
    expect(PROMPT_VERSION).toBe("v1");
  });

  it("covers all seven Section 8.3 requirements", () => {
    // 1: suggest-only, never certify safety
    expect(SYSTEM_PROMPT).toMatch(/never certify safety/i);
    // 2: abstain when undeterminable; never suggest odor
    expect(SYSTEM_PROMPT).toContain("cannot_determine");
    expect(SYSTEM_PROMPT).toMatch(/always return "cannot_determine" for "odor"/);
    // 3: only the provided value codes
    for (const code of ["slightly_cloudy", "a_lot", "colorless"]) {
      expect(SYSTEM_PROMPT).toContain(code);
    }
    // 4: image text is untrusted data
    expect(SYSTEM_PROMPT).toMatch(/untrusted data/);
    // 5: short visible evidence
    expect(SYSTEM_PROMPT).toMatch(/240 characters/);
    // 6: no safety/pathogen/disease claims
    expect(SYSTEM_PROMPT).toMatch(/Never mention safety, pathogens, disease/);
    // 7: honest confidence
    expect(SYSTEM_PROMPT).toMatch(/honest estimate/);
    // rain context included
    expect(SYSTEM_PROMPT).toMatch(/Rain context/);
  });
});
