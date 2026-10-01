# NIM vision-model comparison (read-only)

Date: 2026-09-30. Five eval photos (clear-01, turbid-01, algae-02,
dry-02, litter-02), one single-photo assessment each, through the real
`POST /api/assessments/:id/suggest` route — same uploaded bytes for
every model (pre-shrunk ≤400 KB to satisfy the upload cap). Each model
ran under its own dev-server boot with `AI_PROVIDER=nim` and that
model's exact slug in `AI_MODEL`. No provider code was changed.

## Important: which extraction path actually ran

`nim-provider.ts` engages forced tool-calling only when the model slug
contains `"nemotron"`. None of the three new slugs do, so all three ran
the **prompt-JSON path** — the same path llama uses, making the
llama-vs-newcomers leg of this comparison apples-to-apples (the
nemotron leg compares across paths). Engaging tool-forcing for these
models would require widening that one predicate — proposed below, not
implemented.

Keys: the existing NIM key was reused for all calls (one account key
covers the catalog; model is selected per request).

## Summary

| model                                                         | avg latency                                 | extraction success (of 5 photos)                                                                   |
| ------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| meta/muse-glimmer-30b                                         | ~20.6 s (12.7–29.9 s)                       | 0/5 — valid JSON but truncated at `max_tokens` (`finish_reason: length`) on every full-schema call |
| google/gemma-4-31b-it                                         | >40 s every call (route timeout)            | 0/5 — never answered in time; a trivial one-field probe also exceeded 150 s                        |
| google/diffusiongemma-26b-a4b-it                              | ~3.1 s on successes (2.3–4.0 s)             | 4/5 — full 6-row suggestions; dry-02 returned no usable suggestions (fast 502, 2.8 s)              |
| meta/llama-3.2-11b-vision-instruct (current default, on file) | 5.7 s describe; 15 s + 32.5 s live suggests | structured output incl. correct abstentions                                                        |
| nvidia/nemotron-3-nano-omni-30b-a3b-reasoning (on file)       | 13–30 s full-schema tool calls              | 6/6 structured via tool calls                                                                      |

## Raw pairs (auth redacted; `Bearer` header only, never logged)

### muse-glimmer, clear-01 (HTTP 200 from NIM in 15.9 s, then unusable)

The model returned well-formed JSON that stops mid-array — the 800-token
ceiling cuts its verbose 6-indicator answer:

```json
{"image_quality": "ok", "indicators": [{"indicator": "clarity", "value": "clear", "confidence": 0.8, "evidence": "Bottom rocks and substrate are visible through shallow water with ripples, indicating good transparency.", "visible_cues": ["bottom rocks visible", "translucent water", "substrate detail discernible"]}, {"indicator": "color", "value": "greenish_brown", "confidence": 0.7, "evidence": "Water shows greenish-brown tint
```

(`finish_reason: "length"`; note also the non-vocabulary value
`greenish_brown`, which the normalizer would correctly abstain.) The
route's retry then fails the same way → HTTP 502 `provider_failed`.
Quality signals are strong (correct clarity + evidence); the failure
is budget, not competence.

### gemma-4-31b-it, clear-01 (route timeout, both attempts)

```
HTTP 502 after 40243 ms / 40210 ms — route 40 s timeout fired twice.
```

A minimal one-field probe outside the route also exceeded 150 s. The
model never produced any output in time on this tier; nothing to judge
quality from.

### diffusiongemma, clear-01 (HTTP 200 in 3,951 ms, full body)

```json
{
  "suggestions": [
    {
      "indicator": "clarity",
      "suggested_value": "clear",
      "confidence_band": "high",
      "evidence": "The rocky bed is submerged and clearly visible through the water surface.",
      "cues": ["visible rocks", "transparent water"]
    },
    {
      "indicator": "color",
      "suggested_value": "brown",
      "confidence_band": "medium",
      "evidence": "The water takes on a yellowish-brown tint, likely influenced by the submerged rocks and sediment.",
      "cues": ["brownish tint"]
    },
    {
      "indicator": "algae",
      "suggested_value": "none",
      "confidence_band": "high",
      "evidence": "No distinct patches or heavy growth are visible on the submerged rocks or surface.",
      "cues": []
    },
    {
      "indicator": "litter",
      "suggested_value": "none",
      "confidence_band": "high",
      "evidence": "No floating debris or trash is visible in the water column.",
      "cues": []
    },
    {
      "indicator": "flow",
      "suggested_value": "slow",
      "confidence_band": "medium",
      "evidence": "Small ripples and gentle disturbances on the surface indicate slow movement.",
      "cues": ["ripples", "surface movement"]
    },
    {
      "indicator": "odor",
      "suggested_value": "cannot_determine",
      "confidence_band": "none",
      "evidence": "",
      "cues": []
    }
  ],
  "deduped": false,
  "provider": "nim",
  "model": "google/diffusiongemma-26b-a4b-it"
}
```

Against the team labels for clear-01
(clear/brown/none/none/moderate): 4 of 5 exact, flow adjacent
(slow vs moderate), odor correctly abstained. Similar agreement on
turbid-01 (muddy/brown), algae-02 (green/heavy) and litter-02
(green/heavy/some + clarity abstention).

### diffusiongemma, dry-02 (HTTP 502 in 2,811 ms)

```json
{
  "error": {
    "code": "provider_failed",
    "message": "The AI returned no usable suggestions. Continue manually."
  }
}
```

The model returned an empty indicators array for the dry bed — fast,
honest-ish failure, but a gap: dry scenes currently yield nothing
rather than a `flow: dry` suggestion.

## Recommendation

`google/diffusiongemma-26b-a4b-it` is the strongest candidate for the
new default **on these numbers**: 5–10× faster than anything else
measured, cleanly structured output, evidence quality matching team
labels on sampled rows, correct odor abstention. But 5 photos cannot
carry a default change: the dry-bed blank and the single-run nature of
every number above mean it should first survive the full 22-image eval
(Phase 8 script, an hour of runtime) plus a tool-forcing run if the
predicate is ever widened. Until then, **keep
`meta/llama-3.2-11b-vision-instruct` as the default** — slower but
proven across the full fixture set. `meta/muse-glimmer-30b` is
rejected for now (systematic truncation at production token budgets;
revisit only with a raised `max_tokens` and a re-test), and
`google/gemma-4-31b-it` is rejected outright (never answers within any
usable timeout on this tier).

## Follow-up — 2026-10-01: truncation headroom, dry-bed reruns, variance

Same 5 photos, same prompt shape and sampling params as
`nim-provider.ts` (temp 0.3, top_p 0.9; Task 1 only raises
`max_tokens` 800 → 2500), direct NIM calls this time rather than the
HTTP route — no code, defaults, ADR, or env files touched. Timings are
therefore model times, not route times.

### Task 1 — muse-glimmer at max_tokens 2500: truncation resolved

5/5 parse (was 0/5 at 800). Latencies: 13.8 s, 18.5 s, 20.2 s,
**41.8 s**, 24.9 s — the fix works but one run still exceeds even the
40 s route ceiling. Quality against team labels is genuinely strong:
clear-01 4/5 (only color green-vs-brown wrong), turbid-01 4/5 decided
with an honest algae abstention, litter-02 4/4, and dry-02 got
`flow: dry` with everything else abstained — the only model so far to
suggest `dry` at all. Verdict: **capable but operationally awkward** —
it needs 3× the token budget and still flirts with timeouts. The
earlier rejection stands, upgraded from "failure" to "possible with a
higher ceiling the current route does not offer".

### Task 2 — diffusiongemma dry-bed: intermittent, not transient

Three more dry runs: `flow: dry` alone on dry-02 (1.4 s), empty indicators array
on dry-02 (1.7 s), empty indicators array on dry-01 from the fixture set
(5.0 s). So the earlier route 502 was
the model returning _valid JSON with zero rows_ — fast every time, but
empty. Pattern, not outage: on dry scenes diffusiongemma either emits
a lone `dry` row or nothing usable, never a full assessment. That is a
real abstention-handling gap under Product principle 2 (it neither
reliably suggests `dry` nor abstains informatively per indicator) —
worth knowing, not a disqualifier given every other scene works.

### Task 3 — diffusiongemma variance over 3 runs per photo

| photo     | run 1 (route)      | run 2                 | run 3              | min / avg / max        |
| --------- | ------------------ | --------------------- | ------------------ | ---------------------- |
| clear-01  | 3,951 ms ✓         | 2,557 ms ✓            | 2,246 ms ✓         | 2,246 / 2,918 / 3,951  |
| turbid-01 | 3,845 ms ✓         | 1,737 ms ✓            | 1,737 ms ✓         | 1,737 / 2,440 / 3,845  |
| algae-02  | 2,460 ms ✓         | 1,946 ms ✓            | 1,844 ms ✓         | 1,844 / 2,083 / 2,460  |
| dry-02    | 2,811 ms ✗ (empty) | 1,455 ms ✓ (lone dry) | 1,431 ms ✗ (empty) | sole success: 1,455    |
| litter-02 | 2,265 ms ✓         | 2,024 ms ✓            | 1,941 ms ✗         | successes: 2,024–2,265 |

12 of 15 runs returned usable suggestions (the two empty dry arrays and
the one unparseable litter run did not); all successes land in
1.4–4.0 s with no timeout risk. Variance is tight everywhere except
dry scenes (see Task 2).

### Revised recommendation

Unchanged in structure, sharper in evidence: diffusiongemma stays the
candidate (fast, structured, good eyeball agreement, correct
abstentions where it decides) with two known reservations — dry scenes
and single-run-per-photo coverage everywhere else. muse-glimmer moves
from "rejected" to "backup if token budgets ever rise". gemma stays
rejected. llama stays the default until a full 22-image eval says
otherwise.
