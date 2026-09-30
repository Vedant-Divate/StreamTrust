import { describe, expect, it } from "vitest";
import { mapDevice } from "@/server/fhir/mappers/device";
import { mapLocation } from "@/server/fhir/mappers/location";
import { mapPractitioner } from "@/server/fhir/mappers/practitioner";

describe("mapLocation", () => {
  it("maps a named site with physical type and position", () => {
    const loc = mapLocation({ name: "Mill Creek", lat: 12.9716, lng: 77.5946 }, "loc-1");
    expect(loc).toMatchObject({
      resourceType: "Location",
      id: "loc-1",
      status: "active",
      mode: "instance",
      name: "Mill Creek",
    });
    expect(loc.physicalType?.coding?.[0]).toMatchObject({
      system: "http://terminology.hl7.org/CodeSystem/location-physical-type",
      code: "si",
    });
    expect(loc.position).toMatchObject({ latitude: 12.9716, longitude: 77.5946 });
  });

  it("falls back to 'Stream site' for blank names", () => {
    expect(mapLocation({ name: "  ", lat: 0, lng: 0 }, "x").name).toBe("Stream site");
    expect(mapLocation({ name: null, lat: 0, lng: 0 }, "x").name).toBe("Stream site");
  });
});

describe("mapPractitioner", () => {
  it("carries only the opaque volunteer id, no name", () => {
    const p = mapPractitioner("vol-uuid-1", "prac-1");
    expect(p).toMatchObject({ resourceType: "Practitioner", id: "prac-1", active: true });
    expect(p.identifier?.[0]).toMatchObject({
      system: expect.stringContaining("/volunteer-id"),
      value: "vol-uuid-1",
    });
    expect(p).not.toHaveProperty("name");
  });
});

describe("mapDevice", () => {
  it("records model and prompt version", () => {
    const d = mapDevice("meta/llama-3.2-11b-vision-instruct", "v1", "dev-1");
    expect(d).toMatchObject({ resourceType: "Device", status: "active" });
    expect(d.deviceName?.[0]).toMatchObject({
      name: "meta/llama-3.2-11b-vision-instruct",
      type: "model-name",
    });
    expect(d.type).toMatchObject({ text: "AI vision model" });
    expect(d.version?.[0]).toMatchObject({ value: "v1" });
  });
});
