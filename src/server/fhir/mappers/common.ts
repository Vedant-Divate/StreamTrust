/**
 * Shared FHIR mapping inputs and helpers (Section 10). Pure helpers only.
 * Addendum (Section 12): this file holds the cross-mapper types so the
 * five per-resource mappers stay one-function-per-file.
 */
import { randomUUID } from "node:crypto";

export interface SiteData {
  name: string | null;
  lat: number;
  lng: number;
}

export interface AssessmentData {
  id: string;
  volunteerId: string;
  observedAt: string;
  rainLast24h: string;
  status: string;
  submittedAt: string | null;
  photoWaived: boolean;
}

export interface EntryData {
  indicator: string;
  finalValue: string;
  decisionSource: string;
}

export interface SuggestionData {
  suggestedValue: string;
  confidenceBand: string;
  evidence: string;
  cues: string[];
  provider: string;
  model: string;
  promptVersion: string;
}

/** Canonical base for our CodeSystems/StructureDefinitions. */
export function fhirBase(): string {
  return (process.env.FHIR_BASE_URL ?? "http://localhost:3000/fhir").replace(/\/+$/, "");
}

export function urn(id: string): string {
  return `urn:uuid:${id}`;
}

export function newId(): string {
  return randomUUID();
}
