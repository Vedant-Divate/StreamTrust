import { describe, expect, it } from "vitest";
import { buildNoteText, mapObservation } from "@/server/fhir/mappers/observation";
import { mapProvenance } from "@/server/fhir/mappers/provenance";

const ENTRY = { indicator: "clarity", finalValue: "muddy", decisionSource: "human_override" };
const SUGGESTION = {
  suggestedValue: "cloudy",
  confidenceBand: "medium",
  evidence: "Grey haze.",
  cues: ["haze"],
  provider: "mock",
  model: "mock-1",
  promptVersion: "v1",
};

describe("buildNoteText (Section 10.4)", () => {
  it("duplicates provenance facts for consumers ignoring extensions", () => {
    expect(
      buildNoteText({
        decisionSource: "human_override",
        suggestion: SUGGESTION,
        photoWaived: false,
      })
    ).toBe("Decision: human_override. AI suggested: cloudy (medium). Evidence: Grey haze.");
  });

  it("marks human-only rows with none/n-a and appends the waiver sentence", () => {
    expect(buildNoteText({ decisionSource: "human_only", photoWaived: false })).toBe(
      "Decision: human_only. AI suggested: none (n/a). Evidence: n/a."
    );
    expect(
      buildNoteText({ decisionSource: "human_only", photoWaived: true }).endsWith(
        "Photo: none provided (waiver recorded)."
      )
    ).toBe(true);
  });
});

describe("mapObservation", () => {
  it("maps codes, subject, performer and value", () => {
    const obs = mapObservation({
      id: "obs-1",
      indicator: "clarity",
      entry: ENTRY,
      suggestion: SUGGESTION,
      locationId: "loc-1",
      practitionerId: "prac-1",
      observedAt: "2026-09-30T08:00:00.000Z",
      photoWaived: false,
    });
    expect(obs).toMatchObject({ resourceType: "Observation", id: "obs-1", status: "final" });
    expect(obs.code?.coding?.[0]).toMatchObject({
      system: expect.stringContaining("/CodeSystem/stream-indicator"),
      code: "clarity",
    });
    expect(obs.subject).toMatchObject({ reference: "urn:uuid:loc-1" });
    expect(obs.performer?.[0]).toMatchObject({ reference: "urn:uuid:prac-1" });
    expect(obs.valueCodeableConcept?.coding?.[0]).toMatchObject({ code: "clarity-muddy" });
    expect(obs.note?.[0]?.text).toContain("Decision: human_override.");
    expect(obs.text?.status).toBe("generated");
    expect(obs.text?.div).toContain("Decision: human_override.");
  });

  it("encodes not_applicable values with the compound code", () => {
    const obs = mapObservation({
      id: "obs-2",
      indicator: "clarity",
      entry: { indicator: "clarity", finalValue: "not_applicable", decisionSource: "human_only" },
      locationId: "loc-1",
      practitionerId: "prac-1",
      observedAt: "2026-09-30T08:00:00.000Z",
      photoWaived: true,
    });
    expect(obs.valueCodeableConcept?.coding?.[0]?.code).toBe("clarity-not_applicable");
    expect(obs.note?.[0]?.text).toContain("waiver recorded");
  });
});

describe("mapProvenance", () => {
  it("links author + informant with extensions when a suggestion exists", () => {
    const prov = mapProvenance({
      id: "prov-1",
      observationId: "obs-1",
      practitionerId: "prac-1",
      deviceId: "dev-1",
      submittedAt: "2026-09-30T09:00:00.000Z",
      entry: ENTRY,
      suggestion: SUGGESTION,
      useExtensions: true,
    });
    expect(prov.target?.[0]).toMatchObject({ reference: "urn:uuid:obs-1" });
    expect(prov.recorded).toBe("2026-09-30T09:00:00.000Z");
    expect(prov.agent).toHaveLength(2);
    expect(prov.agent?.[1]?.who).toMatchObject({ reference: "urn:uuid:dev-1" });
    const urls = (prov.extension ?? []).map((e) => e.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        expect.stringContaining("decision-source"),
        expect.stringContaining("ai-suggested-value"),
        expect.stringContaining("ai-confidence-band"),
      ])
    );
    expect(prov.extension?.[0]).toMatchObject({ valueCode: "human_override" });
  });

  it("omits the informant and ai extensions for human-only rows", () => {
    const prov = mapProvenance({
      id: "prov-2",
      observationId: "obs-2",
      practitionerId: "prac-1",
      deviceId: "dev-1",
      submittedAt: "2026-09-30T09:00:00.000Z",
      entry: { indicator: "odor", finalValue: "earthy", decisionSource: "human_only" },
      useExtensions: true,
    });
    expect(prov.agent).toHaveLength(1);
    expect((prov.extension ?? []).map((e) => e.url)).toEqual([
      expect.stringContaining("decision-source"),
    ]);
  });

  it("D-07 fallback carries the same facts as reason text", () => {
    const prov = mapProvenance({
      id: "prov-3",
      observationId: "obs-1",
      practitionerId: "prac-1",
      deviceId: "dev-1",
      submittedAt: "2026-09-30T09:00:00.000Z",
      entry: ENTRY,
      suggestion: SUGGESTION,
      useExtensions: false,
    });
    expect(prov.extension).toBeUndefined();
    expect(prov.reason?.[0]?.text).toContain("Decision: human_override.");
    expect(prov.reason?.[0]?.text).toContain("AI suggested cloudy (medium).");
    expect(prov.text?.div).toContain("Decision: human_override.");
  });
});
