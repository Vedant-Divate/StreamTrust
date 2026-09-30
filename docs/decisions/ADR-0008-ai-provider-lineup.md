# ADR-0008: AI provider lineup — NIM primary, Gemini alt, Mock for tests

- Status: accepted
- Date: 2026-09-29
- Phase: 4

## Context

PROJECT.md Section 5 originally specified Anthropic as the default AI
provider, with Gemini as a secondary provider and Mock for tests
(Section 8.1). For the hackathon build, we evaluated NVIDIA NIM
(build.nvidia.com) as an alternative: it offers a free tier suited to a
time-boxed hackathon build, an OpenAI-compatible API, and a catalog of
vision-capable models.

We compared five NIM vision models (kimi-k3, nemotron-3-nano-omni-30b-a3b-
reasoning, llama-3.2-11b-vision-instruct, llama-3.2-90b-vision-instruct,
paligemma) against their documented capabilities. None support NIM's
native "Structured Output" flag. Of the two viable candidates:

- nemotron-3-nano-omni-30b-a3b-reasoning supports Function Calling and
  Reasoning, and has high real-world usage (8M API calls/30 days),
  indicating a mature, stable endpoint.
- llama-3.2-11b-vision-instruct supports neither function calling nor
  reasoning, relying entirely on prompt-engineered JSON.

## Decision

Replace Anthropic as the default provider with NIM. Keep Gemini as the
secondary/alt provider per the original Section 8.1 plan. Mock remains
test/CI-only, unchanged.

- `nim-provider.ts` (primary): model selectable via `AI_MODEL`.
  - Default: `nemotron-3-nano-omni-30b-a3b-reasoning`, using its
    function-calling capability to define the suggestion schema as a

    single callable tool (closest available equivalent to forced
    structured output, per Section 8.2).

  - Documented fallback: `llama-3.2-11b-vision-instruct`, using pure
    prompt-engineered JSON (no function calling), used only if the
    function-calling extraction path proves unreliable in real testing.
- `gemini-provider.ts` (secondary): current Gemini vision model, model
  ID confirmed against Google's live docs at build time, not hardcoded
  from memory. Gemini's structured-output support is stronger than
  NIM's function-calling workaround.
- `mock-provider.ts` (tests/CI): unchanged, deterministic, never a live
  call, per Section 15.2.

## Consequences

- Section 5's stack table and Section 8.1 examples should be read with
  NIM substituted for Anthropic as the default; `ANTHROPIC_API_KEY` is
  no longer required for the primary path (Gemini's key still is, for
  the secondary provider).
- `normalize.ts` (Section 8.2–8.3) carries more of the correctness
  burden for the NIM path than it would for a native-structured-output
  provider, since NIM's function-calling is a workaround, not a
  guarantee. This does not relax Section 8.2's requirements — it makes
  them more load-bearing. Retry-on-schema-failure (Section 8.4) is
  correspondingly more important for NIM than for Gemini.
- `.env.example` (Section 17.1) updates: `AI_PROVIDER=nim` as the
  default, `NIM_API_KEY` added, `AI_MODEL` documented with both viable
  NIM model IDs, `ANTHROPIC_API_KEY` removed or marked unused.
