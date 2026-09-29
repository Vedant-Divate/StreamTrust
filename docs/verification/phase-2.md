# Phase 2 verification — Core assessment API & volunteer identity

## What was built

- `src/server/security/volunteer-cookie.ts`: anonymous `st_vid` cookie
  (HttpOnly, Lax, Secure in prod, 1-year), shared error shape, and
  `requireOwnedAssessment` (missing cookie → 403, wrong owner → 404).
- Routes: `POST /api/assessments` (issues cookie when absent, rounds
  coordinates to 4 dp), `GET/PATCH /api/assessments/:id` (owner + draft
  only; entries upserted as `human_only`), `POST/DELETE
.../:id/photos` (count/size/type enforced, dimensions parsed from JPEG
  SOF markers), `GET /api/photos/:photoId` (owner byte stream),
  `GET /api/health` (liveness + DB, no secrets).
- `src/lib/image.ts`: browser-only resize + JPEG re-encode (EXIF dropped
  by construction); pure size math unit-tested, in-browser run deferred
  to the Phase 3 e2e.
- `getAssessmentView` repository read (assessment + site + entries +
  suggestions + photo metadata, never bytes).

## Commands run and output (abbreviated, real)

$ pnpm verify (final run)
$ tsc --noEmit / $ eslint — no errors
$ vitest run
Test Files 11 passed (11)
Tests 54 passed (54)
incl. tests/integration/api/assessments.test.ts (10 tests)
incl. tests/integration/api/photos.test.ts (7 tests)
$ next build — all 7 API routes registered as dynamic (ƒ)

## Manual check — live curl sequence on pnpm dev

$ Invoke-WebRequest http://localhost:3000/api/health
200 {"status":"ok","db":"up","aiProvider":"mock","fhirValidationBaseUrl":"https://hapi.fhir.org/baseR4"}

$ POST /api/assessments (no cookie)
201 {"assessment":{"id":"e2c6e5db-6eb8-408c-9a49-485fb845a61f","volunteerId":"00ccca28-5e7e-400c-9e2b-802800cfeedd","siteId":"59f2ee71-f169-471f-90f1-c1ffd04f6666","observedAt":"2026-09-29T08:00:00.000Z","rainLast24h":"heavy","notes":null,"status":"draft","isDemo":false,"consentAt":"2026-09-29T11:01:46.559Z","createdAt":"2026-09-29T11:01:46.559Z","submittedAt":null},"site":{"id":"59f2ee71-f169-471f-90f1-c1ffd04f6666","name":"Curl Creek","lat":12.9716,"lng":77.5946,"accuracyM":null,"createdAt":"2026-09-29T11:01:46.543Z"}}
Set-Cookie: st_vid=00ccca28-5e7e-400c-9e2b-802800cfeedd (matches volunteerId)

$ POST /api/assessments/:id/photos (multipart, 17-byte valid JPEG)
201 {"photo":{"id":"99bf2283-68b3-4b8c-aed2-44846b4d9863","assessmentId":"e2c6e5db-6eb8-408c-9a49-485fb845a61f","mime":"image/jpeg","width":32,"height":16,"sha256":"0be85754f94cacf59fa943bba162bfe7ce5d9751d8a92a44f8997369e4b2c48a","createdAt":"2026-09-29T11:02:22.349Z"}}

$ PATCH /api/assessments/:id (clarity=muddy, odor=earthy)
200 {"assessment":{...,"status":"draft",...},"entries":[{"indicator":"clarity","finalValue":"muddy","decisionSource":"human_only","aiSuggestionId":null,...},{"indicator":"odor","finalValue":"earthy","decisionSource":"human_only","aiSuggestionId":null,...}],"suggestions":[],"photos":[{...,"width":32,"height":16,...}]}
(full JSON in the transcript above; entries + photo metadata present)

$ GET /api/assessments/:id (owner cookie)
200 — same full view as the PATCH response

## Ownership negative tests (all rejected, real output)

$ GET /api/assessments/:id (no cookie)
403 {"error":{"code":"forbidden","message":"A volunteer cookie is required."}}

$ GET /api/assessments/:id (mismatched cookie)
404 {"error":{"code":"not_found","message":"Assessment not found."}}

Rule: missing cookie → 403 `forbidden`; wrong owner or unknown id → 404
`not_found` (no existence leak). Same rule on every photo route;
integration tests cover 403 + 404 on GET, POST-photo, byte-stream and
cross-volunteer DELETE.

## Deviations from PROJECT.md

- API payloads use snake_case keys (`observed_at`, `final_value`) mapped
  to the camelCase domain schemas at the route boundary — contract field
  naming, not a spec change.
- `GET /api/photos/:photoId` (byte stream) implemented in Phase 2 though
  the task list names only POST/DELETE: it is in the Section 7.4 contract
  and Section 12 structure, and ownership had to cover it anyway.
- No ambiguity needed a questions.md entry this phase.

## Commits in this phase

- d71942f feat(security): add anonymous volunteer cookie
- 321f830 feat(api): add assessment create read update routes
- 64464a0 feat(api): add photo upload and delete routes
- 6f3b8a6 feat(lib): add client-side photo resize and exif strip
