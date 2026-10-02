import type { Observation } from "fhir/r4";
import { indicatorSystem, indicatorValueSystem } from "@/server/fhir/mappers/location";
import {
  buildNarrative,
  urn,
  type EntryData,
  type SuggestionData,
} from "@/server/fhir/mappers/common";

export interface ObservationArgs {
  id: string;
  indicator: string;
  entry: EntryData;
  suggestion?: SuggestionData;
  locationId: string;
  practitionerId: string;
  observedAt: string;
  /** ADR-0010 decision: no-photo context rides in every note when waived. */
  photoWaived: boolean;
}

/**
 * Human-readable duplication of the provenance facts (Section 10.4),
 * extended with the waiver sentence when no photo was provided.
 */
export function buildNoteText(args: {
  decisionSource: string;
  suggestion?: SuggestionData;
  photoWaived: boolean;
}): string {
  const suggested = args.suggestion ? args.suggestion.suggestedValue : "none";
  const band = args.suggestion ? args.suggestion.confidenceBand : "n/a";
  const evidence =
    args.suggestion && args.suggestion.evidence
      ? args.suggestion.evidence.replace(/\.+$/, "")
      : "n/a";
  let note = `Decision: ${args.decisionSource}. AI suggested: ${suggested} (${band}). Evidence: ${evidence}.`;
  if (args.photoWaived) note += " Photo: none provided (waiver recorded).";
  return note;
}

/** Map one indicator entry to a FHIR R4 Observation (Section 10.2). Pure. */
export function mapObservation(args: ObservationArgs): Observation {
  const noteText = buildNoteText({
    decisionSource: args.entry.decisionSource,
    suggestion: args.suggestion,
    photoWaived: args.photoWaived,
  });
  return {
    resourceType: "Observation",
    id: args.id,
    status: "final",
    text: buildNarrative([noteText]),
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "survey",
            display: "Survey",
          },
        ],
      },
    ],
    code: {
      coding: [{ system: indicatorSystem(), code: args.indicator }],
    },
    subject: { reference: urn(args.locationId) },
    effectiveDateTime: args.observedAt,
    performer: [{ reference: urn(args.practitionerId) }],
    valueCodeableConcept: {
      coding: [
        { system: indicatorValueSystem(), code: `${args.indicator}-${args.entry.finalValue}` },
      ],
    },
    note: [
      {
        text: noteText,
      },
    ],
  };
}
