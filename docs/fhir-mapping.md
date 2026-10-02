# StreamTrust FHIR mapping (R4)

> Project-defined mapping per PROJECT.md Section 10 — **not** an official
> OneAquaHealth profile (see ADR-0005). Canonical base is the
> deployment-configured `FHIR_BASE_URL` (`http://localhost:3000/fhir` in
> the committed generated files).

## Bundle

`type: transaction`. Every entry: `fullUrl: urn:uuid:<uuid>` +
`request: { method: "POST", url: "<ResourceType>" }`. 15 entries per
assessment: 1 Location, 1 Practitioner, 1 Device, 6 Observations, 6
Provenances. Cross-references use the `urn:uuid` values.

## Resources

| Resource         | Key fields                                                                                                                                                                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Location         | `status: active`, `mode: instance`, `name` or `"Stream site"`, physicalType `si` (`location-physical-type` system), `position` = rounded lat/lng                                                                                                                                                                                                       |
| Practitioner     | `active: true`, identifier `{system: <BASE>/volunteer-id, value: <volunteer uuid>}`, no name                                                                                                                                                                                                                                                           |
| Device           | `status: active`, `deviceName[0] = {name: <model>, type: "model-name"}` (latest suggestion's model, env `AI_MODEL`, else `"manual"`), `type.text = "AI vision model"`, `version[0].value = <PROMPT_VERSION>`                                                                                                                                           |
| Observation (×6) | `status: final`, category `survey`, `code` = indicator (`<BASE>/CodeSystem/stream-indicator`), `subject` → Location, `effectiveDateTime` = observed_at, `performer` → Practitioner, `valueCodeableConcept` = `<indicator>-<value>` (`<BASE>/CodeSystem/stream-indicator-value`, incl. `<indicator>-not_applicable`), `note[0].text` per template below |
| Provenance (×6)  | `target` → Observation, `recorded` = submitted_at, `agent[0]` author → Practitioner, `agent[1]` informant → Device (only when that indicator has an AI suggestion), `activity` = CREATE (`v3-DataOperation`), extensions or fallback text                                                                                                              |
| Media            | Out of scope (P2): photo bytes never enter the Bundle                                                                                                                                                                                                                                                                                                  |

## Observation.note template

`Decision: <source>. AI suggested: <value|none> (<band|n/a>). Evidence: <text|n/a>.`
plus, when the assessment was submitted under a photo waiver,
`Photo: none provided (waiver recorded).` appended to **all six** notes
(ADR-0010 decision: each Observation stays standalone-consumable; no
standard coded element fits at this granularity for MVP).

## Provenance extensions

| URL suffix                                | valueCode                             | Present when                              |
| ----------------------------------------- | ------------------------------------- | ----------------------------------------- |
| `/StructureDefinition/ai-suggested-value` | suggested code                        | an AI suggestion exists for the indicator |
| `/StructureDefinition/ai-confidence-band` | low/medium/high/none                  | an AI suggestion exists                   |
| `/StructureDefinition/decision-source`    | ai_accepted/human_override/human_only | always                                    |

D-07 probe result (2026-09-30, live HAPI): unknown-extension findings
at `information` severity only, zero errors — extensions ship as-is.
Fallback (`useExtensions: false` → same facts in `Provenance.reason`
text) is implemented and unit-tested should any validator report
unknown-extension _errors_.

## Validation

`POST <FHIR_VALIDATION_BASE_URL>/Bundle/$validate`, parse
`OperationOutcome`, count fatal/error vs warning. Gate: zero errors.
Results stored in `fhir_exports`. Only demo/non-sensitive data is ever
sent (rounded coords, no names); the UI says so before sending.

## Expected validator warnings

Every resource carries a generated `text` narrative (built only from
content already present, e.g. the Observation note), which silences the
dom-6 best-practice findings entirely — live HAPI check 2026-10-02 on a
15-entry Bundle: **0 errors, 12 warnings** (all unknown-CodeSystem), 6
information notices (tolerated custom extensions). The remaining
CodeSystem findings are inherent to project-defined systems on a public
validator and cannot be reduced without registering the systems with HL7.

Pre-narratives baseline for comparison — Phase 9 smoke test (2026-10-02,
live HAPI, deployed Bundle without narratives): **0 errors**, 27 warnings
(15 dom-6 + 12 unknown-CodeSystem) + 18 information notices, all in the
same three categories as Phase 6. Warning _counts_ vary per Bundle (they
scale with entry/issue content); only the error count is a gate.

Validating our Bundle against the public HAPI validator returns zero
errors plus non-error findings in three benign, expected categories
(concrete example from the Phase 6 gate: 12 warnings, 15 warnings, and
10 information notices on one 15-entry Bundle). None of them indicates
a mapping defect:

- **Unknown CodeSystem (12 warnings).** HAPI's terminology server has
  no knowledge of our project-defined systems, so every `coding` that
  points at them reports "unknown and can't be validated". The real
  definitions ship in this repo under `public/fhir/CodeSystem/` (and
  per-indicator `public/fhir/ValueSet/` files); anyone validating
  locally can resolve them by loading those files into their own
  terminology server.
- **Missing narrative, dom-6 (15 warnings).** A standard FHIR
  best-practice rule asking every resource for human-readable
  `.text.div`. Our resources carry no narratives by design (machine
  output, no rich-text surface); one notice per Bundle entry.
- **Unknown extension (10 information notices).** HAPI noting our three
  custom Provenance extensions. These arrive at `information` severity
  — deliberately below D-07's error-only fallback trigger — so they
  confirm the extensions were seen and tolerated, not rejected. The
  real definitions ship under `public/fhir/StructureDefinition/`.
