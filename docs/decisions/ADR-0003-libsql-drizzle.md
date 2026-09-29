# ADR-0003: libSQL/Drizzle with local file in dev, Turso in prod

- Status: accepted
- Date: 2026-09-29
- Phase: 1

## Context

PROJECT.md Section 5 prescribes libSQL (SQLite-compatible) via Drizzle ORM:
zero-setup local file DB in development, Turso hosted in production, using
the same driver so no code branches between environments.

## Decision

- `src/server/db/client.ts` connects with `@libsql/client` + `drizzle-orm/libsql`.
- Connection string comes from `DATABASE_URL` (default `file:./local.db`);
  `DATABASE_AUTH_TOKEN` carries the Turso token in production only.
- One shared client instance (with a `globalThis` guard for Next.js dev
  hot-reload). Repositories receive the client as a parameter so tests can
  inject a temporary file database.
- Migrations live in `src/server/db/migrations/`, generated offline with
  `drizzle-kit generate` (`pnpm db:generate`).

## Consequences

- Dev needs no database server; prod switch is env-vars only (set on Vercel
  in Phase 9).
- Photo bytes stay as BLOBs for the MVP per Section 5.1; object storage is
  future scope and needs no schema change to adopt (bytes column can move).
