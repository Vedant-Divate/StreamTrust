# StreamTrust

[![CI](https://github.com/Vedant-Divate/StreamTrust/actions/workflows/ci.yml/badge.svg)](https://github.com/Vedant-Divate/StreamTrust/actions)
Live demo: https://streamtrust.vercel.app

> Observations are for citizen-science monitoring only. This app does not
> determine whether water is safe to touch, drink, or use.

StreamTrust is a mobile-friendly web app that guides a volunteer through a
stream check, uses AI to _suggest_ (never decide) what it sees in their
photos, lets the human confirm or correct every value, catches inconsistent
entries, and saves the result as standards-compliant FHIR data that records
exactly who or what contributed each value.

## Problem & who it's for

Citizen-collected stream observations are inconsistent and error-prone:
people describe the same water differently, misclick, or misunderstand
scientific terms. The data is also hard to share because it lacks standard
structure and provenance, so researchers cannot tell how much to trust a
record. StreamTrust serves three users: the **citizen-science volunteer**
who needs an easy guided flow; the **researcher / program coordinator** who
needs trustworthy, machine-readable records with a human/AI audit trail;
and the **health-informatics integrator** who needs FHIR R4 data that
validates and ingests cleanly.

## How it works

A student visits a stream, takes photos, and answers guided questions. The
AI suggests ("water looks cloudy, green film near the bank — medium
confidence") with visible evidence; she corrects "cloudy" to "muddy"
because it rained yesterday. The app flags a conflict (strong smell but
clean-looking water) for double-checking, then saves. The exported FHIR
Bundle records each final value, the AI's original suggestion, and that a
human overrode it:

`/` → `/assess/new` (place, time, rain, consent) → `/assess/[id]`
(photos, questions + AI panel) → `/assess/[id]/review` (validation,
acknowledgements) → submit → `/assess/[id]/done` (data + FHIR Bundle +
validator result) → `/insights` (AI-vs-human agreement dashboard).

## Tracks addressed

- **Track 3 — AI-Supported Assessment:** AI assists with photo-based
  indicators using explainable, evidence-citing suggestions with
  abstention, validation checks, and a human-in-the-loop confirm/override
  flow.
- **Track 7 — Digital Health Standards:** each confirmed assessment is
  exported as a FHIR R4 transaction Bundle (Location, Practitioner,
  Device, Observations, Provenance) validated against a FHIR validator.

## What's novel about this submission

1. **Provenance in the record itself** (AI suggestion, confidence band,
   human decision, agreement) — auditable data, not a UI badge.
2. **A FHIR Bundle that actually validates** (zero errors), with the
   validator output shown in the demo.
3. **AI that abstains** and cites evidence, with an agreement/override
   view derived from real recorded interactions.
4. **Real photos through a real model** in the demo; anything synthetic
   is labelled.
5. **Reproducible evaluation** on a small labelled photo set, reported
   honestly as a smoke test, not a benchmark.

AI suggestions can be wrong. You make the final decision.

## Tech stack

| Layer              | Choice                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Runtime / language | Node.js, TypeScript (strict), pnpm                                                                      |
| Framework / UI     | Next.js App Router, Tailwind CSS v4, Base UI primitives, Lucide icons                                   |
| Forms / validation | React Hook Form + Zod (schemas shared client/server)                                                    |
| DB                 | libSQL via Drizzle ORM (local file in dev, Turso in prod, same driver)                                  |
| AI                 | Provider interface; `nim` primary (`meta/llama-3.2-11b-vision-instruct`), Gemini alt, Mock for tests/CI |
| FHIR               | `@types/fhir` + hand-written mappers, HAPI `$validate`                                                  |
| Tests              | Vitest (unit/integration), Playwright (e2e + axe)                                                       |
| Quality / CI       | ESLint, Prettier, commitlint + husky, GitHub Actions                                                    |
| Hosting            | Vercel (app) + Turso (DB)                                                                               |

Exact versions: `docs/decisions/ADR-0002-versions.md`.

## Local setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # then fill in real values (never commit them)
pnpm db:migrate              # create tables in ./local.db (fresh checkouts need this)
pnpm dev                     # http://localhost:3000
```

Useful commands: `pnpm verify` (typecheck + lint + test + build),
`pnpm seed:demo` (labelled synthetic demo data, `DATABASE_URL` scoped),
`pnpm eval:ai` (live AI smoke test — needs `NIM_API_KEY`, never runs in
CI). CI runs the same `pnpm verify` steps with `AI_PROVIDER=mock` and a
throwaway `ci.db`, so no live API call is ever required.

## AI evaluation

Results: [`docs/verification/eval-results.md`](docs/verification/eval-results.md).
Small sample, team-labelled; a smoke test, not a benchmark. Across two
full runs on the same 22-photo / 107-label fixture set with the shipping
model, per-indicator agreement landed at **34–50%** (25/73 decided, then
27/54 — free-tier variance), with the model abstaining or erroring on the
rest rather than guessing. Odor: zero guessed values on all 22 images in
both runs (explicit abstentions plus omitted rows that resolve to
human-only) — a correctness check, not just a metric. Any
accuracy/agreement claim in the demo or listing is copied from that file.

## FHIR mapping

Mapping: [`docs/fhir-mapping.md`](docs/fhir-mapping.md) — a
**project-defined mapping, not an official OneAquaHealth profile**.
Submitted assessments validate with **zero errors** against the public
HAPI validator; the remaining findings are documented, expected warnings
(see ["Expected validator warnings"](docs/fhir-mapping.md#expected-validator-warnings):
unknown project CodeSystems, dom-6 narrative notes, tolerated custom
extensions).

## What's next

- Calibrated confidence (replace "self-reported" once enough
  accept/override data exists)
- Blind-first UI mode as an anchoring-bias A/B test
- Object storage (S3/R2) for photos + `Media` in the Bundle
- Push confirmed Bundles to a real FHIR server (SMART on FHIR)
- Offline-first PWA for low-connectivity fieldwork

## AI-assisted development disclosure

Built with an AI coding agent under human direction, per `PROJECT.md`.

## Licence

MIT — see [LICENSE](LICENSE).
