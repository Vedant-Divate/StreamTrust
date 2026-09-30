# Phase 4 Gemini check — live status, 2026-09-30

Verdict: **Gemini works, but Google's API is currently overloaded —
no code, key, model-ID, or contract failure found. No fix attempted,
per the task brief.**

## What was tried

Local dev with `AI_PROVIDER=gemini` (empty `AI_MODEL` → provider
default `gemini-3.8-flash`), same 320×240 bands test photo as the NIM
pre-flight, full flow per assessment: draft 201 → photo upload 201 →
`POST /suggest`.

## Direct provider probe (works)

`GeminiProvider.suggest()` called directly (tsx, same key, same image):

- Model: `gemini-3.8-flash`. Latency: **3,765 ms**, HTTP 200.
- Request (key redacted; auth goes in the `x-goog-api-key` header):
  `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`
  with `system_instruction` = v1 system prompt, one user text part
  (rain context + JSON-shape instruction), one `inline_data`
  `image/jpeg` part (`<base64 omitted>`), and
  `generationConfig: { temperature: 0.3, topP: 0.9, maxOutputTokens: 800,
responseMimeType: "application/json" }`.
- Response text (verbatim): `{"image_quality":"no_water_visible",
"indicators":[` five rows, one per indicator except odor, e.g.
  `{"indicator":"clarity","value":"cannot_determine","confidence":0,
"evidence":"No water is visible in the image.","visible_cues":[]}`
  `…]}`.

Contract check (by inspection against `normalize.ts`): every row carries
a valid indicator code, a value, a numeric confidence, evidence ≤240
chars, and a cues array — so all five normalize to stored rows;
`odor` is absent entirely, which normalizes to "no suggestion" →
`human_only`, exactly as designed. The pre-existing normalize unit
tests (adversarial payload incl. forced odor-abstention) already cover
the enforcement side. No normalizer change needed.

## Route-level attempts (blocked by Google, not by us)

Four full `POST /suggest` calls across two fresh assessments, each with
the route's built-in single retry — **8/8 provider attempts failed
identically**: `Gemini API error 503` (server log), surfaced as HTTP
502 `provider_failed`. First failure observed ~10:05 local; still
failing ~25 minutes later. An hour earlier the same key and model
returned HTTP 200 in 5 s, so this is free-tier demand overload, not a
regression. The route behaved exactly as specified (retry once on 5xx,
then honest 502 + "Continue manually").

## Latency comparison (same test input)

| Path                          | Result                            |
| ----------------------------- | --------------------------------- |
| Gemini direct (off-peak)      | **3.8 s**, correct colors         |
| Gemini via route (this check) | 502 after 2× 503 (10–30 s burned) |
| Llama pre-flight describe     | 5.7 s, correct                    |
| Llama live suggest            | 15 s and 32 s, correct shape      |
| Nemotron full-schema          | 13–30 s range                     |

When Google is not overloaded, Gemini is the fastest path measured so
far. Quality-wise on this input all three read the image correctly
(blue/green/brown/yellow); richness can't be compared fairly because
the Gemini probe asked for one sentence.

## Recommendation

Re-run this exact check later (same photo, same route); if it returns
200 with `provider: gemini`, append the pair here and consider Gemini
for latency-sensitive demo segments. Nothing in `gemini-provider.ts`
or `normalize.ts` needs changing based on this evidence.
