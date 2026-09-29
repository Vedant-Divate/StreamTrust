/**
 * CRUD repository for AI suggestions. Persistence only — normalization,
 * abstention rules and confidence banding belong to Phase 4.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { DbClient } from "@/server/db/client";
import { aiSuggestions } from "@/server/db/schema";

function now(): string {
  return new Date().toISOString();
}

export interface InsertSuggestionInput {
  assessmentId: string;
  indicator: string;
  suggestedValue: string;
  confidenceBand: string;
  confidenceScore?: number;
  evidence: string;
  cuesJson: string;
  provider: string;
  model: string;
  promptVersion: string;
  latencyMs: number;
  rawResponseJson: string;
}

export async function insertSuggestion(db: DbClient, input: InsertSuggestionInput) {
  const id = randomUUID();
  await db.insert(aiSuggestions).values({
    id,
    assessmentId: input.assessmentId,
    indicator: input.indicator,
    suggestedValue: input.suggestedValue,
    confidenceBand: input.confidenceBand,
    confidenceScore: input.confidenceScore ?? null,
    evidence: input.evidence,
    cuesJson: input.cuesJson,
    provider: input.provider,
    model: input.model,
    promptVersion: input.promptVersion,
    latencyMs: input.latencyMs,
    rawResponseJson: input.rawResponseJson,
    createdAt: now(),
  });
  const [row] = await db.select().from(aiSuggestions).where(eq(aiSuggestions.id, id));
  return row;
}

export async function getSuggestionById(db: DbClient, id: string) {
  const [row] = await db.select().from(aiSuggestions).where(eq(aiSuggestions.id, id));
  return row;
}

export async function getSuggestionsByAssessment(db: DbClient, assessmentId: string) {
  return db.select().from(aiSuggestions).where(eq(aiSuggestions.assessmentId, assessmentId));
}
