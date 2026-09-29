# ADR-0002: Dependency and toolchain versions (Phase 0)

- Status: accepted
- Date: 2026-09-29
- Phase: 0

## Context

PROJECT.md Section 5 requires recording the exact versions installed at build
time. The scaffold used the latest stable releases available on 2026-09-29.

## Decision

Phase 0 toolchain (exact installed versions from `pnpm list --depth=0`):

- Runtime: Node.js v24.14.0 (PROJECT.md suggested Node 22 LTS; the build
  machine provides Node 24, which is newer and runs the Next 16 scaffold
  cleanly, so it is used as-is), pnpm 12.6.0
- Framework: next 16.3.6, react 19.2.8, react-dom 19.2.8
- Styling: tailwindcss 4.3.3, @tailwindcss/postcss 4.3.3 (Tailwind v4 CSS-first
  config; no `tailwind.config.ts` file — the v4 default replaces it)
- Language/tooling: typescript 5.9.3, @types/node 20.19.43,
  @types/react 19.3.0, @types/react-dom 19.3.0
- Lint/format: eslint 9.39.5, eslint-config-next 16.3.6 (flat
  `eslint.config.mjs`, which replaces the `.eslintrc.cjs` named in
  PROJECT.md Section 12), prettier 3.9.9
- Tests: vitest 5.0.2, @playwright/test 1.63.0
- Git hooks: husky 9.1.7, lint-staged 17.6.0, @commitlint/cli 21.2.3,
  @commitlint/config-conventional 21.2.3
- UI primitives (`pnpm dlx shadcn@latest init -y -d`): @base-ui/react 1.8.0,
  class-variance-authority 0.7.1, cn 0.4.0, lucide-react 1.48.0,
  tw-animate-css 1.4.0, shadcn CLI 4.21.0 (devDependency). Note: the current
  shadcn CLI defaults to Base UI primitives instead of Radix; this is accepted
  as-is since both provide accessible primitives per PROJECT.md Section 5.

## Phase 1 additions

- drizzle-orm 0.45.3, @libsql/client 0.18.0, zod 4.6.5, drizzle-kit 0.31.11
  (devDependency; needs esbuild postinstall builds, allowed in
  `pnpm-workspace.yaml`).

## Consequences

- Where the scaffold's file names differ from PROJECT.md Section 12
  (`eslint.config.mjs` instead of `.eslintrc.cjs`, `postcss.config.mjs`
  instead of `postcss.config.js`, no `tailwind.config.ts` under Tailwind v4),
  the scaffold's files win; this ADR records the difference so no separate
  deviation ADR is needed.
- Runtime/data dependencies (drizzle-orm, @libsql/client, zod,
  react-hook-form, @anthropic-ai/sdk, fhir tooling) are installed in their
  respective phases (1, 2, 4, 6) and recorded in follow-up version notes.
