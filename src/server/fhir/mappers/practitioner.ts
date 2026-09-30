import type { Practitioner } from "fhir/r4";
import { fhirBase } from "@/server/fhir/mappers/common";

/**
 * Map an anonymous volunteer to a Practitioner carrying only the opaque
 * volunteer UUID (Section 10.2). No name — privacy by construction. Pure.
 */
export function mapPractitioner(volunteerId: string, id: string): Practitioner {
  return {
    resourceType: "Practitioner",
    id,
    active: true,
    identifier: [
      {
        system: `${fhirBase()}/volunteer-id`,
        value: volunteerId,
      },
    ],
  };
}
