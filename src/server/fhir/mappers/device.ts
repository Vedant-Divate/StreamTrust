import type { Device } from "fhir/r4";
import { buildNarrative } from "@/server/fhir/mappers/common";

/**
 * Map the AI vision model configuration to a Device (Section 10.2).
 * Always emitted so Provenance informant references resolve, even for
 * human-only assessments (model then names the configured default).
 * Pure.
 */
export function mapDevice(model: string, promptVersion: string, id: string): Device {
  const summary =
    model === "manual"
      ? "Manual entry without AI assistance."
      : `AI vision model ${model}, prompt version ${promptVersion}.`;
  return {
    resourceType: "Device",
    id,
    status: "active",
    text: buildNarrative([summary]),
    deviceName: [{ name: model, type: "model-name" }],
    type: { text: "AI vision model" },
    version: [{ value: promptVersion }],
  };
}
