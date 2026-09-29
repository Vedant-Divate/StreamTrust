import { describe, expect, it } from "vitest";
import {
  MAX_PHOTO_BYTES,
  assessmentCreateSchema,
  indicatorEntrySchema,
  photoMetadataSchema,
} from "@/domain/schemas";

const validAssessment = {
  site: { name: "Mill Creek", lat: 12.9716, lng: 77.5946, accuracyM: 10 },
  observedAt: "2026-09-29T08:00:00.000Z",
  rainLast24h: "light",
  consent: true,
  notes: "Water looked brown after yesterday's rain.",
} as const;

describe("assessmentCreateSchema", () => {
  it("accepts a valid draft creation payload", () => {
    const parsed = assessmentCreateSchema.parse(validAssessment);
    expect(parsed.site.lat).toBe(12.9716);
    expect(parsed.rainLast24h).toBe("light");
  });

  it("accepts a payload without optional fields", () => {
    const { name: _n, accuracyM: _a, ...bareSite } = validAssessment.site;
    void _n;
    void _a;
    const parsed = assessmentCreateSchema.parse({
      site: bareSite,
      observedAt: validAssessment.observedAt,
      rainLast24h: validAssessment.rainLast24h,
      consent: validAssessment.consent,
    });
    expect(parsed.site.name).toBeUndefined();
  });

  it("rejects missing consent", () => {
    const result = assessmentCreateSchema.safeParse({ ...validAssessment, consent: false });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    expect(
      assessmentCreateSchema.safeParse({
        ...validAssessment,
        site: { lat: 91, lng: 0 },
      }).success
    ).toBe(false);
    expect(
      assessmentCreateSchema.safeParse({
        ...validAssessment,
        site: { lat: 0, lng: -181 },
      }).success
    ).toBe(false);
  });

  it("rejects an invalid date and an unknown rain value", () => {
    expect(
      assessmentCreateSchema.safeParse({ ...validAssessment, observedAt: "yesterday" }).success
    ).toBe(false);
    expect(
      assessmentCreateSchema.safeParse({ ...validAssessment, rainLast24h: "drizzle" }).success
    ).toBe(false);
  });
});

describe("indicatorEntrySchema", () => {
  it("accepts a valid entry", () => {
    expect(indicatorEntrySchema.parse({ indicator: "clarity", finalValue: "muddy" })).toEqual({
      indicator: "clarity",
      finalValue: "muddy",
    });
  });

  it("rejects an unknown indicator and an empty value", () => {
    expect(indicatorEntrySchema.safeParse({ indicator: "fish", finalValue: "muddy" }).success).toBe(
      false
    );
    expect(indicatorEntrySchema.safeParse({ indicator: "clarity", finalValue: "  " }).success).toBe(
      false
    );
  });
});

describe("photoMetadataSchema", () => {
  it("accepts a resized JPEG within limits", () => {
    expect(
      photoMetadataSchema.parse({
        mime: "image/jpeg",
        width: 1280,
        height: 960,
        sizeBytes: 200 * 1024,
      }).mime
    ).toBe("image/jpeg");
  });

  it("rejects wrong mime, oversize bytes and bad dimensions", () => {
    const base = { mime: "image/jpeg", width: 1280, height: 960, sizeBytes: 100 };
    expect(photoMetadataSchema.safeParse({ ...base, mime: "image/png" }).success).toBe(false);
    expect(photoMetadataSchema.safeParse({ ...base, sizeBytes: MAX_PHOTO_BYTES + 1 }).success).toBe(
      false
    );
    expect(photoMetadataSchema.safeParse({ ...base, width: 0 }).success).toBe(false);
  });
});
