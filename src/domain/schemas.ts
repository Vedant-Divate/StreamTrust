/**
 * Zod schemas shared by client and server for assessment inputs
 * (PROJECT.md Sections 7.2, 7.4). Boundary validation only — cross-field
 * consistency lives in the Phase 5 rule engine. Pure domain module.
 */
import { z } from "zod";
import { INDICATOR_CODES, RAIN_LAST_24H_CODES } from "@/domain/vocab";

/** Max resized photo size accepted by the API (PROJECT.md Section 7.4). */
export const MAX_PHOTO_BYTES = 400 * 1024;

export const uuidSchema = z.uuid();

export const rainLast24hSchema = z.enum(RAIN_LAST_24H_CODES);

export const siteInputSchema = z.object({
  name: z.string().trim().max(120).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().positive().optional(),
});

export const assessmentCreateSchema = z.object({
  site: siteInputSchema,
  observedAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  rainLast24h: rainLast24hSchema,
  consent: z.literal(true, {
    message: "Consent is required",
  }),
  notes: z.string().trim().max(2000).optional(),
});

export const indicatorEntrySchema = z.object({
  indicator: z.enum(INDICATOR_CODES),
  finalValue: z.string().trim().min(1).max(64),
});

export const photoMetadataSchema = z.object({
  mime: z.literal("image/jpeg"),
  width: z.number().int().min(1).max(8192),
  height: z.number().int().min(1).max(8192),
  sizeBytes: z.number().int().min(1).max(MAX_PHOTO_BYTES),
});

export type AssessmentCreateInput = z.infer<typeof assessmentCreateSchema>;
export type IndicatorEntryInput = z.infer<typeof indicatorEntrySchema>;
export type PhotoMetadata = z.infer<typeof photoMetadataSchema>;
export type SiteInput = z.infer<typeof siteInputSchema>;
