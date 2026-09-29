# Agent instructions for StreamTrust

Read `PROJECT.md` fully before writing any code. It is the ground truth.

Rules:

1. Work one phase at a time (PROJECT.md Section 14). Do not start the next phase
   until the current phase's Verification Gate is written to
   `docs/verification/phase-N.md` with real, pasted command output.
2. After implementing and verifying each individual feature (not the whole
   phase), commit it separately using Conventional Commits
   (PROJECT.md Section 13.3). Never use `git commit --no-verify`.
3. Run `pnpm verify` before every commit. Do not commit if it fails.
4. Never invent requirements not in PROJECT.md. If something is ambiguous,
   apply the documented default, log the ambiguity in `docs/questions.md`,
   and continue — don't stall waiting for an answer.
5. Any deviation from PROJECT.md requires an ADR in `docs/decisions/` (template
   in PROJECT.md Appendix C) committed in the same or a preceding commit.
6. Never commit secrets. `.env.example` only, with placeholders.
7. Domain code (`src/domain/**`) must not import from `src/server/**` or
   `src/app/**`. UI code must not import from `src/server/**`.
