import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./helpers";
import {
  createAssessment,
  createSite,
  createVolunteer,
} from "@/server/db/repositories/assessments";
import {
  getSuggestionById,
  getSuggestionsByAssessment,
  insertSuggestion,
} from "@/server/db/repositories/suggestions";

describe("suggestion repository", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let assessmentId: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    const volunteer = await createVolunteer(ctx.db);
    const site = await createSite(ctx.db, { lat: 3, lng: 3 });
    const created = await createAssessment(ctx.db, {
      volunteerId: volunteer.id,
      siteId: site.id,
      observedAt: "2026-09-29T08:00:00.000Z",
      rainLast24h: "light",
    });
    assessmentId = created!.id;
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it("stores suggestions including abstentions and reads them back", async () => {
    const clarity = await insertSuggestion(ctx.db, {
      assessmentId,
      indicator: "clarity",
      suggestedValue: "cloudy",
      confidenceBand: "medium",
      confidenceScore: 0.7,
      evidence: "Uniform haze; streambed not visible.",
      cuesJson: JSON.stringify(["uniform haze"]),
      provider: "mock",
      model: "mock-1",
      promptVersion: "v1",
      latencyMs: 12,
      rawResponseJson: "{}",
    });
    await insertSuggestion(ctx.db, {
      assessmentId,
      indicator: "odor",
      suggestedValue: "cannot_determine",
      confidenceBand: "none",
      evidence: "Odor cannot be judged from a photo.",
      cuesJson: JSON.stringify([]),
      provider: "mock",
      model: "mock-1",
      promptVersion: "v1",
      latencyMs: 12,
      rawResponseJson: "{}",
    });

    expect(clarity?.confidenceScore).toBe(0.7);
    const fetched = await getSuggestionById(ctx.db, clarity!.id);
    expect(fetched?.rawResponseJson).toBe("{}");

    const all = await getSuggestionsByAssessment(ctx.db, assessmentId);
    expect(all).toHaveLength(2);
    const odor = all.find((s) => s.indicator === "odor");
    expect(odor?.suggestedValue).toBe("cannot_determine");
    expect(odor?.confidenceScore).toBeNull();
  });
});
