# ADR-0001: Single Next.js app (no separate backend)

- Status: accepted
- Date: 2026-09-29
- Phase: 0

## Context

PROJECT.md Section 6.3 prescribes a single Next.js app where UI and API route
handlers live in one repo and one deployment, to minimize moving parts during
a short hackathon build.

## Decision

Build StreamTrust as a single Next.js (App Router) app. UI pages live under
`src/app/`, API route handlers under `src/app/api/`, shared domain code under
`src/domain/`, and server-only services under `src/server/`. No separate
backend service or second deployment.

## Consequences

- One Vercel deployment serves UI and API; no CORS or multi-service config.
- Server-only code must stay under `src/server/` and never be imported by
  client components (enforced by the dependency rule in PROJECT.md Section 6.1).
- Long-running AI calls must respect the serverless `maxDuration` limit
  (verified in Phase 9).
