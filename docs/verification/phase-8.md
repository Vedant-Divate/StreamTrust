# Phase 8 verification — Hardening

## 1. AI evaluation

Fixtures: 22 openly-licensed photos + 73 team labels (`labels.csv`,
rights in `ATTRIBUTIONS.md`) — delivered and committed before this
phase; no placeholders, no fabricated labels. Script:
`scripts/eval-ai.ts` (`pnpm eval:ai`, manual, never CI), one retry on
retryable failures mirroring the production route.

Result (`docs/verification/eval-results.md`, honest caveat repeated
inline): **27 of 54 decided agree (50.0%)**, 5 abstentions, 10 images
unprocessable (llama emits markdown prose instead of JSON for them —
deterministic per image; no extraction heuristic recovers structure
that was never emitted). Per indicator: clarity 75%, color 66.7%,
litter 50%, algae 42.9%, flow 9.1% (model defaults to "moderate").
Reads as designed: a smoke test, not a benchmark — and it already paid
off twice (fence-stripping + prose-extraction fixes in `nim-provider`,
label CRLF trim in the script).

## 2. Accessibility

`tests/e2e/axe.spec.ts`: axe (wcag2a/aa, wcag21a/aa) on `/`,
`/assess/new`, the wizard step, `/insights` — **4/4 green, zero
violations of any impact** on a follow-up full dump (nothing to fix,
nothing excused). Keyboard operability is additionally asserted in the
happy-path e2e (Tab order, Space toggles).

## 3. Security checklist (Section 16, item by item)

- [x] No PII collected — volunteers table holds only a UUID; Practitioner carries no name (mapper unit-tested); no name/email fields anywhere.
- [x] Location rounded to 4 dp before storage (route `round4`, asserted in tests).
- [x] EXIF stripped client-side and **proven, not assumed**: a 2000px JPEG with a crafted GPS APP1 segment was uploaded through the real browser pipeline (`exif-strip.spec.ts`) — stored bytes contain no `Exif` header and measure 1600×1200.
- [x] Consent required (UI checkbox + server `literal(true)` + 400 test).
- [x] Ownership on every route — re-tested this phase for all post-Phase-2 routes: submit, acks, suggest (added mismatched-404), validate, fhir GET, fhir/validate (all 403 anon / 404 stranger, green).
- [x] Rate limiting under real repeated calls (11 live POSTs → 10×200 + 429).
- [x] Server-side photo limits — live bypass attempts rejected: PNG → 400 "Only image/jpeg is accepted.", 400KB+1 → 400 "at most 409600 bytes." (4-photo cap covered in tests).
- [x] No secrets in client bundle — `grep` of `.next/static` for `nvapi-|AIza|AQ.Ab8|DATABASE_AUTH|NIM_API_KEY|GEMINI_API_KEY`: **zero matches**; `.env.local` never committed (only `.env.example` tracked).
- [x] No secrets committed — git history contains no `.env.local`, no key values.
- [x] Prompt hygiene — v1 prompt unit-tested for all 7 requirements (no safety claims, abstain, visible-only evidence, untrusted image text).
- [x] No AI preselection — suggestions render in a separate panel; values only change on explicit clicks (e2e).
- [x] Disclaimers — landing, footer, about, demo badge (COPY-tested, screenshotted).
- [x] HAPI data non-sensitive by construction + explicit pre-send UI notice.
- [ ] Lockfile frozen install in CI — not checkable: no CI workflow exists until Phase 9.

## 4. Error states (all triggered live, all honest, none crash)

- AI provider down (invalid key → NIM 401 → 502): wizard shows "The AI is unavailable. Continue manually.", stays on the step.
- FHIR validator down (connection refused): done page shows "Validation failed. Try again later."
- DB down (unopenable path): wizard/review show "Could not load this assessment…" instead of a blank screen or stack trace.

## 5. Copy pass

Full re-read of `copy.ts` vs 11.3/1.6: one stale line found and fixed
(`doneText` still promised the FHIR view "arrives in a later step" —
it shipped in Phase 6). Everything else plain-language with both
mandatory disclaimers intact.

## 6. Performance sanity

Real 3000×2000 photo through the real uploader: **156,686 → 61,588
bytes (~61% smaller)**, 1600px capped. Resize genuinely reduces upload
size; EXIF goes with it (see security).

## Process notes

- `pnpm verify` green at every commit (144/144); two transient vitest
  hook timeouts under machine load re-ran green — environmental, noted.
- 238 stale temp test DBs cleaned from the OS temp dir (Windows file
  locks prevent test-time deletion; harmless but untidy).
- Commits: eval script, eval results, fence/prose fixes + label trim,
  eval retry, axe spec, ownership tests, EXIF spec, copy fix, this gate.

## Deviations

- None requiring an ADR. Eval fence/prose handling and CSV trimming are
  robustness fixes inside specified behavior, not spec changes.
