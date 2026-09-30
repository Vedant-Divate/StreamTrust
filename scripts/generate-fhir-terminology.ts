/**
 * Generate FHIR terminology from the domain vocabulary (PROJECT.md 10.5).
 * `src/domain/vocab.ts` is the single source of truth; run:
 *   pnpm fhir:terminology
 * BASE defaults to FHIR_BASE_URL (example: http://localhost:3000/fhir).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { INDICATORS, NOT_APPLICABLE, NOT_APPLICABLE_INDICATORS } from "../src/domain/vocab";

const BASE = process.env.FHIR_BASE_URL ?? "http://localhost:3000/fhir";
const OUT = join(__dirname, "..", "public", "fhir");

function valueCode(indicator: string, value: string): string {
  return `${indicator}-${value}`;
}

function main() {
  const indicatorSystem = `${BASE}/CodeSystem/stream-indicator`;
  const valueSystem = `${BASE}/CodeSystem/stream-indicator-value`;

  const indicatorCs = {
    resourceType: "CodeSystem",
    url: indicatorSystem,
    name: "StreamIndicator",
    title: "StreamTrust stream indicators",
    status: "active",
    content: "complete",
    concept: INDICATORS.map((d) => ({
      code: d.code,
      display: d.label,
      definition: d.scientificTerm,
    })),
  };

  const valueConcepts: { code: string; display: string; definition: string }[] = [];
  for (const d of INDICATORS) {
    for (const v of d.values) {
      valueConcepts.push({
        code: valueCode(d.code, v.code),
        display: v.label,
        definition: v.helpText,
      });
    }
    if ((NOT_APPLICABLE_INDICATORS as readonly string[]).includes(d.code)) {
      valueConcepts.push({
        code: valueCode(d.code, NOT_APPLICABLE),
        display: "Not applicable",
        definition: "There is no water to describe because the stream bed is dry.",
      });
    }
  }
  const valueCs = {
    resourceType: "CodeSystem",
    url: valueSystem,
    name: "StreamIndicatorValue",
    title: "StreamTrust stream indicator values",
    status: "active",
    content: "complete",
    concept: valueConcepts,
  };

  mkdirSync(join(OUT, "CodeSystem"), { recursive: true });
  mkdirSync(join(OUT, "ValueSet"), { recursive: true });
  writeFileSync(
    join(OUT, "CodeSystem", "stream-indicator.json"),
    JSON.stringify(indicatorCs, null, 2) + "\n"
  );
  writeFileSync(
    join(OUT, "CodeSystem", "stream-indicator-value.json"),
    JSON.stringify(valueCs, null, 2) + "\n"
  );

  for (const d of INDICATORS) {
    const codes = d.values.map((v) => valueCode(d.code, v.code));
    if ((NOT_APPLICABLE_INDICATORS as readonly string[]).includes(d.code)) {
      codes.push(valueCode(d.code, NOT_APPLICABLE));
    }
    const vs = {
      resourceType: "ValueSet",
      url: `${BASE}/ValueSet/stream-indicator-value-${d.code}`,
      name: `StreamIndicatorValue${d.code[0].toUpperCase()}${d.code.slice(1)}`,
      title: `StreamTrust values for ${d.label}`,
      status: "active",
      compose: {
        include: [
          {
            system: valueSystem,
            concept: codes.map((code) => {
              const concept = valueConcepts.find((c) => c.code === code)!;
              return { code, display: concept.display };
            }),
          },
        ],
      },
    };
    writeFileSync(
      join(OUT, "ValueSet", `stream-indicator-value-${d.code}.json`),
      JSON.stringify(vs, null, 2) + "\n"
    );
  }

  const extensions = ["ai-suggested-value", "ai-confidence-band", "decision-source"];
  mkdirSync(join(OUT, "StructureDefinition"), { recursive: true });
  for (const name of extensions) {
    const sd = {
      resourceType: "StructureDefinition",
      url: `${BASE}/StructureDefinition/${name}`,
      name,
      title: `StreamTrust ${name}`,
      status: "active",
      kind: "complex-type",
      abstract: false,
      type: "Extension",
      baseDefinition: "http://hl7.org/fhir/StructureDefinition/Extension",
      derivation: "constraint",
      context: [{ type: "element", expression: "Provenance" }],
      differential: {
        element: [
          { id: "Extension", path: "Extension", min: 0, max: "1" },
          {
            id: "Extension.url",
            path: "Extension.url",
            fixedUri: `${BASE}/StructureDefinition/${name}`,
          },
        ],
      },
    };
    writeFileSync(
      join(OUT, "StructureDefinition", `${name}.json`),
      JSON.stringify(sd, null, 2) + "\n"
    );
  }

  console.log(`Wrote terminology for base ${BASE}`);
  console.log(`Indicators: ${INDICATORS.length}, value concepts: ${valueConcepts.length}`);
}

main();
