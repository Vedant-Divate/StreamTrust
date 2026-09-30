/**
 * CRUD repositories for volunteers, sites, assessments and indicator
 * entries. Persistence only — no business logic (no status transitions,
 * no decision_source computation; those belong to later phases).
 */
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { DbClient } from "@/server/db/client";
import {
  aiSuggestions,
  assessments,
  indicatorEntries,
  photos,
  sites,
  volunteers,
} from "@/server/db/schema";

function now(): string {
  return new Date().toISOString();
}

export async function createVolunteer(db: DbClient) {
  const id = randomUUID();
  await db.insert(volunteers).values({ id, createdAt: now() });
  const [row] = await db.select().from(volunteers).where(eq(volunteers.id, id));
  return row;
}

export interface CreateSiteInput {
  name?: string;
  lat: number;
  lng: number;
  accuracyM?: number;
}

export async function createSite(db: DbClient, input: CreateSiteInput) {
  const id = randomUUID();
  await db.insert(sites).values({
    id,
    name: input.name ?? null,
    lat: input.lat,
    lng: input.lng,
    accuracyM: input.accuracyM ?? null,
    createdAt: now(),
  });
  const [row] = await db.select().from(sites).where(eq(sites.id, id));
  return row;
}

export interface CreateAssessmentInput {
  volunteerId: string;
  siteId: string;
  observedAt: string;
  rainLast24h: string;
  notes?: string;
  consentAt?: string;
}

export async function createAssessment(db: DbClient, input: CreateAssessmentInput) {
  const id = randomUUID();
  await db.insert(assessments).values({
    id,
    volunteerId: input.volunteerId,
    siteId: input.siteId,
    observedAt: input.observedAt,
    rainLast24h: input.rainLast24h,
    notes: input.notes ?? null,
    consentAt: input.consentAt ?? now(),
    createdAt: now(),
  });
  return getAssessmentById(db, id);
}

export async function getAssessmentById(db: DbClient, id: string) {
  const [row] = await db.select().from(assessments).where(eq(assessments.id, id));
  return row;
}

export interface UpdateDraftInput {
  observedAt?: string;
  rainLast24h?: string;
  notes?: string | null;
}

export async function updateAssessmentDraft(db: DbClient, id: string, patch: UpdateDraftInput) {
  await db
    .update(assessments)
    .set({
      ...(patch.observedAt !== undefined ? { observedAt: patch.observedAt } : {}),
      ...(patch.rainLast24h !== undefined ? { rainLast24h: patch.rainLast24h } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    })
    .where(eq(assessments.id, id));
  return getAssessmentById(db, id);
}

export interface UpsertEntryInput {
  assessmentId: string;
  indicator: string;
  finalValue: string;
  decisionSource: string;
  aiSuggestionId?: string;
}

export async function upsertIndicatorEntry(db: DbClient, input: UpsertEntryInput) {
  const updatedAt = now();
  await db
    .insert(indicatorEntries)
    .values({
      id: randomUUID(),
      assessmentId: input.assessmentId,
      indicator: input.indicator,
      finalValue: input.finalValue,
      decisionSource: input.decisionSource,
      aiSuggestionId: input.aiSuggestionId ?? null,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [indicatorEntries.assessmentId, indicatorEntries.indicator],
      set: {
        finalValue: input.finalValue,
        decisionSource: input.decisionSource,
        aiSuggestionId: input.aiSuggestionId ?? null,
        updatedAt,
      },
    });
  const [row] = await db
    .select()
    .from(indicatorEntries)
    .where(eq(indicatorEntries.assessmentId, input.assessmentId));
  return row;
}

export async function getIndicatorEntries(db: DbClient, assessmentId: string) {
  return db.select().from(indicatorEntries).where(eq(indicatorEntries.assessmentId, assessmentId));
}

/** Remove one indicator entry (e.g. clearing a stale `not_applicable`). */ export async function deleteIndicatorEntry(
  db: DbClient,
  assessmentId: string,
  indicator: string
) {
  await db
    .delete(indicatorEntries)
    .where(
      and(
        eq(indicatorEntries.assessmentId, assessmentId),
        eq(indicatorEntries.indicator, indicator)
      )
    );
}

/** Record the submit-time provenance outcome for one entry. */
export async function setEntryDecisionSource(
  db: DbClient,
  assessmentId: string,
  indicator: string,
  decisionSource: string,
  aiSuggestionId: string | null
) {
  await db
    .update(indicatorEntries)
    .set({ decisionSource, aiSuggestionId, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(indicatorEntries.assessmentId, assessmentId),
        eq(indicatorEntries.indicator, indicator)
      )
    );
}

/**
 * Read-only composed view for the API: assessment + site + entries +
 * suggestions + photo metadata (never photo bytes).
 */
export async function getAssessmentView(db: DbClient, assessmentId: string) {
  const assessment = await getAssessmentById(db, assessmentId);
  if (!assessment) return undefined;
  const [site] = await db.select().from(sites).where(eq(sites.id, assessment.siteId));
  const entries = await getIndicatorEntries(db, assessmentId);
  const suggestionRows = await db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.assessmentId, assessmentId));
  // Public snake_case shape, matching POST /suggest responses.
  const suggestions = suggestionRows.map((s) => ({
    indicator: s.indicator,
    suggested_value: s.suggestedValue,
    confidence_band: s.confidenceBand,
    evidence: s.evidence,
    cues: JSON.parse(s.cuesJson) as string[],
  }));
  const photoMeta = await db
    .select({
      id: photos.id,
      mime: photos.mime,
      width: photos.width,
      height: photos.height,
      sha256: photos.sha256,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .where(eq(photos.assessmentId, assessmentId));
  return { assessment, site, entries, suggestions, photos: photoMeta };
}

/**
 * Finalize a draft. Only flips a `draft` row to `submitted` (returns
 * false otherwise); completeness and rule gating live in the routes
 * and Phase 5, not here.
 */
export async function submitAssessment(db: DbClient, assessmentId: string) {
  const assessment = await getAssessmentById(db, assessmentId);
  if (!assessment || assessment.status !== "draft") return undefined;
  const submittedAt = new Date().toISOString();
  await db
    .update(assessments)
    .set({ status: "submitted", submittedAt })
    .where(eq(assessments.id, assessmentId));
  return getAssessmentById(db, assessmentId);
}
