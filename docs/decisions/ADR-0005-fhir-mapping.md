# ADR-0005: FHIR R4 mapping (project-defined, not an official profile)

- Status: accepted
- Date: 2026-09-30
- Phase: 6

## Context

PROJECT.md Section 10 defines a documented, defensible FHIR R4 mapping
for StreamTrust assessments. Phase 0 found no organizer-provided FHIR
sandbox or profile to conform to (A-2), so the Section 10 mapping
stands as specified, with the decisions below filling its gaps.
`docs/fhir-mapping.md` carries the full field table.

## Decision

- Bundle: `transaction` with `urn:uuid` fullUrls and POST entries.
- One Location (site), one Practitioner (opaque volunteer UUID only),
  one Device (model config), six Observations (survey category, our
  indicator/value CodeSystems), six Provenances (author always,
  informant only when an AI suggestion exists for that indicator).
- Provenance extensions (`ai-suggested-value`, `ai-confidence-band`,
  `decision-source`) are sent as real coded extensions; the D-07 live
  probe showed HAPI reporting them at `information` severity only, with
  zero errors — so no fallback was applied. Minimal StructureDefinitions
  are published under `public/fhir/StructureDefinition/` regardless.
- `photo_waived` (ADR-0010) is represented as a `Photo: none provided
(waiver recorded).` sentence appended to every `Observation.note`
  when waived — each Observation stays standalone-consumable. Not coded
  (no suitable standard element exists at this granularity for MVP).
- Canonicals use the deployment-configured `FHIR_BASE_URL`; generated
  terminology under `public/fhir/` is produced from `vocab.ts` by
  `pnpm fhir:terminology`.

## Consequences

- Consumers ignoring extensions still get every provenance fact from
  `Observation.note` text (Section 10.4 pattern).
- If a future validator or profile rejects the custom extensions with
  errors, D-07 applies: drop them, keep the facts in
  `Provenance.reason`/`Observation.note` (already implemented as the
  `useExtensions: false` path and unit-tested).
- Any official OneAquaHealth profile published later supersedes this
  mapping via a new ADR.
