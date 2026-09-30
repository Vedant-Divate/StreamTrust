import type { Location } from "fhir/r4";
import { fhirBase, type SiteData } from "@/server/fhir/mappers/common";

/** Map a stream site to a FHIR R4 Location (Section 10.2). Pure. */
export function mapLocation(site: SiteData, id: string): Location {
  return {
    resourceType: "Location",
    id,
    status: "active",
    mode: "instance",
    name: site.name?.trim() ? site.name : "Stream site",
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
