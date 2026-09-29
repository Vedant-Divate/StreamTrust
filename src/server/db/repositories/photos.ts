/**
 * CRUD repository for assessment photos. Persistence only — size, type and
 * count limits are enforced at the API boundary (Phase 2), not here.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { DbClient } from "@/server/db/client";
import { photos } from "@/server/db/schema";

function now(): string {
  return new Date().toISOString();
}

export interface InsertPhotoInput {
  assessmentId: string;
  mime: string;
  width: number;
  height: number;
  bytes: Buffer;
  sha256: string;
}

export async function insertPhoto(db: DbClient, input: InsertPhotoInput) {
  const id = randomUUID();
  await db.insert(photos).values({
    id,
    assessmentId: input.assessmentId,
    mime: input.mime,
    width: input.width,
    height: input.height,
    bytes: input.bytes,
    sha256: input.sha256,
    createdAt: now(),
  });
  return getPhotoById(db, id);
}

export async function getPhotoById(db: DbClient, id: string) {
  const [row] = await db.select().from(photos).where(eq(photos.id, id));
  return row;
}

export async function getPhotosByAssessment(db: DbClient, assessmentId: string) {
  return db.select().from(photos).where(eq(photos.assessmentId, assessmentId));
}

export async function countPhotosByAssessment(db: DbClient, assessmentId: string) {
  const rows = await getPhotosByAssessment(db, assessmentId);
  return rows.length;
}

export async function deletePhotoById(db: DbClient, id: string) {
  await db.delete(photos).where(eq(photos.id, id));
}
