import type { Provenance } from "fhir/r4";
import { fhirBase, urn, type EntryData, type SuggestionData } from "@/server/fhir/mappers/common";

export interface ProvenanceArgs {
  id: string;
  observationId: string;
  practitionerId: string;
  deviceId: string;
  submittedAt: string;
  entry: EntryData;
  suggestion?: SuggestionData;
  /**
   * false = D-07 fallback: drop the custom extensions and carry the same
   * facts in `reason` text instead.
   */
  useExtensions: boolean;
}

const PARTICIPANT = "http://terminology.hl7.org/CodeSystem/provenance-participant-type";
const DATA_OP = "http://terminology.hl7.org/CodeSystem/v3-DataOperation";

/** Map one entry's provenance (Section 10.2–10.3). Pure. */
export function mapProvenance(args: ProvenanceArgs): Provenance {
  const base = fhirBase();
  const agent: Provenance["agent"] = [
    {
      type: { coding: [{ system: PARTICIPANT, code: "author" }] },
      who: { reference: urn(args.practitionerId) },
    },
  ];
  if (args.suggestion) {
    agent.push({
      type: { coding: [{ system: PARTICIPANT, code: "informant" }] },
      who: { reference: urn(args.deviceId) },
    });
  }

  const provenance: Provenance = {
    resourceType: "Provenance",
    id: args.id,
    target: [{ reference: urn(args.observationId) }],
    recorded: args.submittedAt,
    activity: { coding: [{ system: DATA_OP, code: "CREATE" }] },
    agent,
  };

  if (args.useExtensions) {
    const extension: NonNullable<Provenance["extension"]> = [
      { url: `${base}/StructureDefinition/decision-source`, valueCode: args.entry.decisionSource },
    ];
    if (args.suggestion) {
      extension.push(
        {
          url: `${base}/StructureDefinition/ai-suggested-value`,
          valueCode: args.suggestion.suggestedValue,
        },
        {
          url: `${base}/StructureDefinition/ai-confidence-band`,
          valueCode: args.suggestion.confidenceBand,
        }
      );
    }
    provenance.extension = extension;
  } else {
    const bits = [`Decision: ${args.entry.decisionSource}.`];
    if (args.suggestion) {
      bits.push(
        `AI suggested ${args.suggestion.suggestedValue} (${args.suggestion.confidenceBand}).`
      );
    }
    provenance.reason = [{ text: bits.join(" ") }];
  }
  return provenance;
}
