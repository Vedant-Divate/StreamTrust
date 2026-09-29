# Phase 1 verification — Domain layer & database

## What was built

- `src/domain/vocab.ts`: six indicators, values, plain labels, scientific
  terms, AI-suggest flags, `not_applicable` dry-bed handling, rain context.
- `src/domain/copy.ts`: app name, both Section 1.6 disclaimers, demo-data
  notice, consent text.
- `src/domain/schemas.ts`: Zod boundary schemas for assessment creation,
  indicator entries, photo metadata (`MAX_PHOTO_BYTES` = 400 KB).
- `src/domain/types.ts`: status, decision-source and confidence-band unions.
- `src/server/db/schema.ts`: all nine Section 7.2 tables via Drizzle;
  `drizzle-kit generate` produced the first migration.
- `src/server/db/client.ts`: shared libSQL client (file in dev, Turso in
  prod — ADR-0003); `drizzle.config.ts`; `pnpm db:generate` script.
- Repositories (`assessments.ts`, `photos.ts`, `suggestions.ts`): CRUD only,
  database injected as a parameter; no status or decision-source logic.

## Commands run and output (abbreviated, real)

$ pnpm db:generate
9 tables
assessments 11 columns 0 indexes 2 fks
ai_suggestions 14 columns 0 indexes 1 fks
fhir_exports 8 columns 0 indexes 1 fks
indicator_entries 7 columns 1 indexes 2 fks
photos 8 columns 0 indexes 1 fks
rate_events 4 columns 0 indexes 0 fks
sites 6 columns 0 indexes 0 fks
volunteers 2 columns 0 indexes 0 fks
warning_acks 5 columns 0 indexes 1 fks
[✓] Your SQL migration file ➜ src\server\db\migrations\0000_keen_amphibian.sql

$ pnpm verify (final run)
$ tsc --noEmit / $ eslint — no errors
$ vitest run
✓ tests/unit/smoke.test.ts (1 test)
✓ tests/unit/domain/copy.test.ts (2 tests)
✓ tests/unit/domain/vocab.test.ts (9 tests)
✓ tests/unit/domain/schemas.test.ts (9 tests)
✓ tests/integration/db/suggestions.test.ts (1 test)
✓ tests/integration/db/photos.test.ts (2 tests)
✓ tests/integration/db/assessments.test.ts (4 tests)
Test Files 7 passed (7)
Tests 28 passed (28)
$ next build — Compiled successfully, static `/` + `/_not-found`

Dependency-rule check (no `server`/`app` imports in `src/domain/`):
$ Select-String -Path "src/domain/*.ts" -Pattern 'from "@/server|from "@/app'
(no matches)

## Manual check — sample row inserted and read back

Throwaway tsx script against a file DB with the real migration applied
(script deleted afterwards; output pasted verbatim):

$ pnpm dlx tsx ./phase1-sample.tmp.ts
ASSESSMENT: {"id":"6ec027c1-ae1e-4c3a-be6f-de1af8ffd0e8","volunteerId":"c53c6d8f-cd5c-46ad-bc2c-8bd4faa4b0c0","siteId":"c339943b-d377-4c99-a976-1b4878513bbf","observedAt":"2026-09-29T08:00:00.000Z","rainLast24h":"heavy","notes":null,"status":"draft","isDemo":false,"consentAt":"2026-09-29T09:58:48.022Z","createdAt":"2026-09-29T09:58:48.022Z","submittedAt":null}
ENTRIES: [{"id":"5123e581-971c-4c7d-af17-147dd5dbd3dc","assessmentId":"6ec027c1-ae1e-4c3a-be6f-de1af8ffd0e8","indicator":"clarity","finalValue":"muddy","decisionSource":"human_only","aiSuggestionId":null,"updatedAt":"2026-09-29T09:58:48.027Z"}]

Migration file listing (`src/server/db/migrations/`):

- 0000_keen_amphibian.sql (3334 bytes — CREATE TABLE x9 + unique index)
- meta/0000_snapshot.json, meta/_journal.json (drizzle-kit bookkeeping)

## Deviations from PROJECT.md

- Test DBs are in-memory libSQL (`:memory:`) instead of temp files: the
  Windows file lock survives `client.close()`, so temp-dir cleanup failed
  with EPERM (14 stray dirs observed, removed). Same driver, same real
  migration — no behavior difference. No ADR: test-only setup detail.
- `vitest.config.ts` gained the `@/` alias (test runner parity with
  tsconfig `paths`); scaffold gap, not a spec deviation.
- `pnpm-workspace.yaml` allows the esbuild postinstall build (required by
  drizzle-kit) and `.gitignore` now excludes local `*.db` files.

## Commits in this phase

- a2a5fe6 feat(domain): add stream indicator vocabulary
- 6151a47 feat(domain): add user-facing copy strings
- ac97709 feat(domain): add zod schemas for assessment and entries
- 5c0869b feat(db): add drizzle schema and initial migration
- 9094b20 feat(db): add assessment, photo, suggestion repositories
