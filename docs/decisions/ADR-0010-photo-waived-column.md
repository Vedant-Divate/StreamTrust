# ADR-0010: Persist photo_waived on assessments

- Status: accepted
- Date: 2026-09-30
- Phase: 5 (post-gate fix)

## Context

Phase 5 shipped the photo waiver as a payload-only input (D-03): Section
7.3 requires "≥1 photo OR photo waiver checked" for a valid submission,
but Section 7.2 defined no column for it. Once the submit request
payload was gone, a submitted zero-photo assessment kept no recorded
explanation — at odds with Section 7.3's state machine and Section 10's
assumption that exported facts are traceable.

## Decision

Add `photo_waived` (boolean, default false) to `assessments` via a new
forward-only migration (`0001`), leaving the Phase 1 migration
untouched. The submit route persists the payload's `photo_waiver` value
onto the row at finalize time. Rule evaluation keeps reading the
payload waiver (the attestation belongs to the submit moment), while
the column is the durable record readable back via `GET
/api/assessments/:id` (the assessment row is returned whole, so no
contract change was needed).

## Consequences

- Submitted zero-photo records now durably record why that was
  acceptable.
- Phase 6's FHIR mapping may reference the column (e.g. in
  `Observation.note` or as assessment context). Deliberately left for
  Phase 6 to decide while building the mappers — not done here.
- Deployed databases need the `0001` migration applied (Turso was
  migrated as part of this change).
