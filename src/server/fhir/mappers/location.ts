import type { Location } from "fhir/r4";
import { buildNarrative, fhirBase, type SiteData } from "@/server/fhir/mappers/common";

/** Map a stream site to a FHIR R4 Location (Section 10.2). Pure. */
export function mapLocation(site: SiteData, id: string): Location {
  const name = site.name?.trim() ? site.name : "Stream site";
  return {
    resourceType: "Location",
    id,
    status: "active",
    mode: "instance",
    name,
    text: buildNarrative([`${name} at latitude ${site.lat}, longitude ${site.lng}.`]),
    physicalType: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/location-physical-type",
          code: "si",
          display: "Site",
        },
      ],
    },
    position: {
      longitude: site.lng,
      latitude: site.lat,
    },
  };
}

export function indicatorSystem(): string {
  return `${fhirBase()}/CodeSystem/stream-indicator`;
}

export function indicatorValueSystem(): string {
  return `${fhirBase()}/CodeSystem/stream-indicator-value`;
}
