# Phase 9 verification — Deployment, CI, submission packaging

Deployed URL: https://streamtrust.vercel.app

## 1. CI (task 1)

`.github/workflows/ci.yml` per Section 17.2 (install --frozen-lockfile,
typecheck, lint, test, build; `AI_PROVIDER=mock`, `DATABASE_URL=file:./ci.db` —
no live API call possible). Pushed as `b674d14`; real GitHub Actions run
**36971376795** on that exact SHA: `completed success`
(https://github.com/Vedant-Divate/StreamTrust/actions/runs/36971376795).
Final gate commit `24a7de2` likewise green twice
(**36973339327**, **36973339290**, both `completed success`).

## 2. Production env (task 2)

Owner-supplied Vercel env list (screenshot, all Production scope) shows:
DATABASE_AUTH_TOKEN, DATABASE_URL, AI_PROVIDER, AI_MODEL, NIM_API_KEY,
NIM_LLAMA_API_KEY, GEMINI_API_KEY. Three Section-17.1 names are absent —
FHIR_VALIDATION_BASE_URL, VOLUNTEER_COOKIE_SECRET,
RATE_LIMIT_SUGGEST_PER_HOUR — but none is read in `src/` (HAPI fallback
in code; opaque unsigned cookie; hardcoded limit 10; see D-08), so all
three are behavior-neutral. Independently proven by the smoke test below:
DATABASE_URL/TOKEN (draft+photo writes), AI_PROVIDER=nim + AI_MODEL +
NIM_API_KEY (live llama suggestions), FHIR validation (default HAPI URL).

## 3. maxDuration (task 3)

Re-checked live against the Vercel docs
(`functions/configuring-functions/duration`, updated 2026-08-24):
**Hobby default = maximum = 300 s**. `export const maxDuration = 120` on
the suggest route (ADR-0009) is unchanged and fits with wide margin; the
route's own 40 s per-attempt timeout fired nothing — worst observed
suggest latency anywhere is 41.8 s on a Token-heavy model locally, 17.9 s
on prod (see §4).

## 4. Deployed smoke test (task 4)

2026-10-02 against https://streamtrust.vercel.app, real fixture photo
`tests/fixtures/eval/algae-01.jpg` (108 KB, openly licensed, attributed).
Assessment `e1aa57ef-9df8-4fa0-a639-e053486e17a6` (deleted after, see §5).

| step                         | result                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET /api/health              | 200 (2490 ms) `{"status":"ok","db":"up","aiProvider":"nim",…}` — migration-state check passes on the prod Turso DB                                            |
| POST /api/assessments        | 201 (1844 ms), id + volunteer cookie issued                                                                                                                   |
| POST …/photos (algae-01.jpg) | 201 (2995 ms)                                                                                                                                                 |
| POST …/suggest               | 200 (17,920 ms), `model: meta/llama-3.2-11b-vision-instruct`, 6 rows: clarity cloudy, color green, algae heavy, litter some, flow slow, odor cannot_determine |
| PATCH entries                | 200 (5526 ms); finals clarity clear, color brown, algae none, litter none, odor sewage_like, flow slow (flow accepted as suggested, rest overridden)          |
| POST …/validate              | 200 (2047 ms): errors [], warnings [R-SMELL-CLEAN, R-COLOR-CLARITY]                                                                                           |
| POST …/acks ×2               | 201 + 201 (both warnings acknowledged)                                                                                                                        |
| POST …/submit                | 200 (4588 ms)                                                                                                                                                 |
| GET assessment               | 200; decision_source: flow ai_accepted; clarity/color/algae/litter human_override; odor human_only — exactly the Section 7.2 rule                             |
| GET …/fhir                   | 200, Bundle with 15 entries (1 Location + 1 Practitioner + 1 Device + 6 Observations + 6 Provenances)                                                         |
| POST …/fhir/validate         | 200: **errorCount 0**, warningCount 27, infoCount 18 (same three expected categories as `docs/fhir-mapping.md`)                                               |
| GET /api/health (final)      | 200 (627 ms)                                                                                                                                                  |

## 5. Prod DB cleanup (task 5)

Turso audit found 5 non-demo assessments (zero demo rows, zero genuine
rows). **Deleted** all five with their child rows (entries, suggestions,
photos, acks, exports), IDs + rationale: `d7cedc88` (documented Phase 4
orphan draft), `84aae4df` (Phase 4-followup deployed test), `826713f5` +
`2b4bfa88` (unknown manual tests, submitted 2026-10-01), `e1aa57ef`
(this smoke test). Volunteers/sites/rate_events left (invisible in UI).
Verified after: `/api/insights?demo=exclude` → `pairs: 0`; health 200.

## 6–7. README + fhir-mapping (tasks 6–7)

README rewritten to all 12 Appendix E sections (eval range 34–50%
stated, never cherry-picked; mapping link + Expected-warnings anchor;
AI disclosure; MIT LICENCE added). `docs/fhir-mapping.md` extended with
the Phase 9 smoke result (0 errors, same categories — mapping unchanged).

## 8. Tag (task 8)

`git tag submission-v1` on the gate commit below, after final verify.

## Commands run and output (abbreviated, real)

$ pnpm verify — 26 files / 147 tests green, build ok (before every commit)
$ pnpm db:migrate — `migrated file:./probe-sg.db` (also dogfoods the new script)
CI run 36971376795: completed success (link §1)

## Section 20 checklist — done vs owner

- [x] Public GitHub repo, README complete, MIT licence
- [x] Working deployed URL, smoke-tested end to end (this file)
- [x] Eval numbers match any claim (README cites the 34–50% range)
- [x] Disclaimers visible (landing/footer/about/demo badge + video TBD)
- [x] All P0 features demonstrably working (smoke test above)
- [x] Final commit tagged (`submission-v1`); CI green
- [ ] Deadline confirmed on logged-in Devpost dashboard — OWNER (human)
- [ ] Team/individual eligibility + registration — OWNER (was: individual OK per Rules tab; re-confirm)
- [ ] Demo video (3–5 min, Section 1.4 flow) — OWNER (human)
- [ ] Devpost form + screenshots/GIFs + track text — OWNER (human)

## Deviations from PROJECT.md

- None requiring an ADR. D-07/D-08 logged in `docs/questions.md`.

## Commits in this phase

- `b674d14` ci(github): add lint test build workflow
- `8fa3442` docs(readme): write final readme with setup and disclosures
- `12f980b` docs(fhir): finalize fhir mapping document
- this commit + `submission-v1` tag
