import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./helpers";
import {
  createAssessment,
  createSite,
  createVolunteer,
  deleteIndicatorEntry,
  getAssessmentById,
  getIndicatorEntries,
  updateAssessmentDraft,
  upsertIndicatorEntry,
} from "@/server/db/repositories/assessments";

describe("assessment repository", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it("creates a volunteer, site and draft assessment and reads them back", async () => {
    const volunteer = await createVolunteer(ctx.db);
    const site = await createSite(ctx.db, { name: "Mill Creek", lat: 12.9716, lng: 77.5946 });
    const created = await createAssessment(ctx.db, {
      volunteerId: volunteer.id,
      siteId: site.id,
      observedAt: "2026-09-29T08:00:00.000Z",
      rainLast24h: "heavy",
      notes: "Brown after rain.",
    });

    expect(created?.status).toBe("draft");
    expect(created?.isDemo).toBe(false);
    expect(created?.submittedAt).toBeNull();

    const fetched = await getAssessmentById(ctx.db, created!.id);
    expect(fetched).toMatchObject({
      volunteerId: volunteer.id,
      siteId: site.id,
      rainLast24h: "heavy",
    });
  });

  it("returns undefined for an unknown assessment id", async () => {
    expect(await getAssessmentById(ctx.db, "00000000-0000-4000-8000-000000000000")).toBeUndefined();
  });

  it("updates draft fields", async () => {
    const volunteer = await createVolunteer(ctx.db);
    const site = await createSite(ctx.db, { lat: 0, lng: 0 });
    const created = await createAssessment(ctx.db, {
      volunteerId: volunteer.id,
      siteId: site.id,
      observedAt: "2026-09-29T08:00:00.000Z",
      rainLast24h: "unknown",
    });
    const updated = await updateAssessmentDraft(ctx.db, created!.id, {
      rainLast24h: "light",
      notes: "Added later.",
    });
    expect(updated?.rainLast24h).toBe("light");
    expect(updated?.notes).toBe("Added later.");
    expect(updated?.status).toBe("draft");
  });

  it("upserts indicator entries keeping one row per indicator", async () => {
    const volunteer = await createVolunteer(ctx.db);
    const site = await createSite(ctx.db, { lat: 1, lng: 1 });
    const created = await createAssessment(ctx.db, {
      volunteerId: volunteer.id,
      siteId: site.id,
      observedAt: "2026-09-29T08:00:00.000Z",
      rainLast24h: "none",
    });

    await upsertIndicatorEntry(ctx.db, {
      assessmentId: created!.id,
      indicator: "clarity",
      finalValue: "cloudy",
      decisionSource: "human_only",
    });
    await upsertIndicatorEntry(ctx.db, {
      assessmentId: created!.id,
      indicator: "clarity",
      finalValue: "muddy",
      decisionSource: "human_only",
    });

    const entries = await getIndicatorEntries(ctx.db, created!.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ indicator: "clarity", finalValue: "muddy" });
  });

  it("deletes a single indicator entry", async () => {
    const volunteer = await createVolunteer(ctx.db);
    const site = await createSite(ctx.db, { lat: 1, lng: 1 });
    const created = await createAssessment(ctx.db, {
      volunteerId: volunteer.id,
      siteId: site.id,
      observedAt: "2026-09-29T08:00:00.000Z",
      rainLast24h: "none",
    });

    await upsertIndicatorEntry(ctx.db, {
      assessmentId: created!.id,
      indicator: "clarity",
      finalValue: "not_applicable",
      decisionSource: "human_only",
    });
    await upsertIndicatorEntry(ctx.db, {
      assessmentId: created!.id,
      indicator: "flow",
      finalValue: "dry",
      decisionSource: "human_only",
    });
    await deleteIndicatorEntry(ctx.db, created!.id, "clarity");

    const entries = await getIndicatorEntries(ctx.db, created!.id);
    expect(entries.map((e) => e.indicator)).toEqual(["flow"]);
  });
});
