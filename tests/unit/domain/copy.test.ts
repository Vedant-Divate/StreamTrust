import { describe, expect, it } from "vitest";
import { COPY } from "@/domain/copy";

describe("user-facing copy", () => {
  it("provides every planned string, non-empty", () => {
    for (const [key, value] of Object.entries(COPY)) {
      expect(value.trim().length, key).toBeGreaterThan(0);
    }
  });

  it("contains the mandatory disclaimers from Section 1.6", () => {
    expect(COPY.disclaimerMonitoringOnly).toContain("citizen-science monitoring only");
    expect(COPY.disclaimerMonitoringOnly).toContain("does not determine whether water is safe");
    expect(COPY.disclaimerAiCanBeWrong).toContain("You make the final decision");
    expect(COPY.demoDataNotice).toContain("synthetic, not real observations");
    expect(COPY.consentCheckbox).toContain("avoid photographing people");
  });
});
