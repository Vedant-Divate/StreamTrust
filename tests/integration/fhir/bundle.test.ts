import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Bundle, Observation, Provenance } from "fhir/r4";
import { createTestDb } from "../db/helpers";
import {
  createAssessment,
  createSite,
  createVolunteer,
  submitAssessment,
  upsertIndicatorEntry,
} from "@/server/db/repositories/assessments";
import { insertSuggestion } from "@/server/db/repositories/suggestions";
import { buildBundle } from "@/server/fhir/build-bundle";

const SIX = [
  { indicator: "clarity", finalValue: "muddy" },
  { indicator: "color", finalValue: "brown" },
  { indicator: "algae", finalValue: "patches" },
  { indicator: "litter", finalValue: "some" },
  { indicator: "flow", finalValue: "slow" },
  { indicator: "odor", finalValue: "earthy" },
] as const;

describe("buildBundle", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let assessmentId: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    const volunteer = await createVolunteer(ctx.db);
    const site = await createSite(ctx.db, { name: "Bundle Creek", lat: 12.9716, lng: 77.5946 });
    const created = await createAssessment(ctx.db, {
      volunteerId: volunteer.id,
      siteId: site.id,
      observedAt: "2026-09-30T08:00:00.000Z",
      rainLast24h: "heavy",
    });
    assessmentId = created!.id;
    for (const e of SIX) {
      await upsertIndicatorEntry(ctx.db, {
        assessmentId,
        indicator: e.indicator,
        finalValue: e.finalValue,
        decisionSource: "human_only",
      });
    }
    await insertSuggestion(ctx.db, {
      assessmentId,
      indicator: "clarity",
      suggestedValue: "cloudy",
      confidenceBand: "medium",
      confidenceScore: 0.7,
      evidence: "Haze.",
      cuesJson: JSON.stringify(["haze"]),
      provider: "mock",
      model: "mock-1",
      promptVersion: "v1",
      latencyMs: 5,
      rawResponseJson: "{}",
    });
    await submitAssessment(ctx.db, assessmentId, { photoWaived: true });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it("assembles 15 transaction entries with resolvable references", async () => {
    const bundle = await buildBundle(ctx.db, assessmentId);
    expect(bundle).toMatchObject({ resourceType: "Bundle", type: "transaction" });
    expect(bundle.entry).toHaveLength(15);

    const fullUrls = new Set((bundle.entry as NonNullable<Bundle["entry"]>).map((e) => e.fullUrl));
    const refs: string[] = [];
    for (const e of bundle.entry as NonNullable<Bundle["entry"]>) {
      expect(e.request).toMatchObject({ method: "POST" });
      const text = JSON.stringify(e.resource);
      for (const m of text.matchAll(/"reference":"(urn:uuid:[^"]+)"/g)) refs.push(m[1]);
    }
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(fullUrls.has(ref)).toBe(true);
  });

  it("carries provenance facts and the waiver note", async () => {
    const bundle = await buildBundle(ctx.db, assessmentId);
    const observations = bundle
      .entry!.map((e) => e.resource)
      .filter((r): r is Observation => r?.resourceType === "Observation");
    expect(observations).toHaveLength(6);
    const clarity = observations.find((o) => o.code?.coding?.[0]?.code === "clarity")!;
    expect(clarity.valueCodeableConcept?.coding?.[0]?.code).toBe("clarity-muddy");
    expect(clarity.note?.[0]?.text).toContain("waiver recorded");

    const provenances = bundle
      .entry!.map((e) => e.resource)
      .filter((r): r is Provenance => r?.resourceType === "Provenance");
    expect(provenances).toHaveLength(6);
    const clarityProv = provenances.find(
      (p) => p.target?.[0]?.reference === `urn:uuid:${clarity.id}`
    )!;
    expect(clarityProv.agent).toHaveLength(2);
    expect(clarityProv.extension?.map((x) => x.url)).toEqual(
      expect.arrayContaining([expect.stringContaining("decision-source")])
    );
  });

  it("refuses drafts", async () => {
    const volunteer = await createVolunteer(ctx.db);
    const site = await createSite(ctx.db, { lat: 0, lng: 0 });
    const draft = await createAssessment(ctx.db, {
      volunteerId: volunteer.id,
      siteId: site.id,
      observedAt: "2026-09-30T08:00:00.000Z",
      rainLast24h: "none",
    });
    await expect(buildBundle(ctx.db, draft!.id)).rejects.toThrow("submitted");
  });
});
