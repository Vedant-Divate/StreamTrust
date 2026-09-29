/**
 * CRUD repositories for volunteers, sites, assessments and indicator
 * entries. Persistence only — no business logic (no status transitions,
 * no decision_source computation; those belong to later phases).
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { DbClient } from "@/server/db/client";
import { assessments, indicatorEntries, sites, volunteers } from "@/server/db/schema";

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
