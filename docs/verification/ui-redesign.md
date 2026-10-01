# UI redesign — field-notebook visual pass (scoped, not a phase)

Procedural note: `/mnt/skills/public/frontend-design/SKILL.md` does not
exist anywhere in this environment (checked C/D/E/F drives; logged as
D-06 in `docs/questions.md`). The two-pass process below follows the
task brief's own description of it: plan a token system grounded in the
subject matter, critique it against the named generic tells, revise,
then build — with restraint, screenshots, and green axe/e2e at the end.

## 1. Design plan (color / type / layout / principles)

**Direction: a waterproof field notebook at the water's edge.** The user
is a volunteer standing beside a stream with a phone, working through a
careful survey form. The UI should feel like that notebook: calm paper,
dark ink, one watery accent, tabular readings, checkbox rhythm — never
a tech-product dashboard.

**Color** (oklch, light-first; `.dark` kept coherent): misty creek-wash
paper `0.965 0.014 195` (cool and watery — not cream), deep slate-teal
ink `0.25 0.03 210`, one creek-teal action color `0.44 0.095 190`.
Severity keeps three wash + left-bank + icon treatments: red, amber,
slate-blue. Amber is caution-semantics from the domain (turbid water,
field caution flags), not decoration. Every text/background pair was
verified ≥ WCAG AA by computation before building:

| pair                        | ratio       |
| --------------------------- | ----------- |
| ink / paper                 | 14.40       |
| white / primary (buttons)   | 7.18        |
| muted / paper               | 6.40        |
| error text / wash / paper   | 5.58 / 6.02 |
| warning text / wash / paper | 6.23 / 6.54 |
| info text / wash / paper    | 6.42 / 6.91 |

**Type:** field-journal serif stack (Georgia, Iowan Old Style,
Palatino, Times) for the wordmark, headings, step numerals, and
dashboard readings; sans body. Sentence case everywhere. Monospace only
inside JSON `<pre>` blocks (code content, not data labels).
Tabular numerals for all readings.

**Layout / motifs (boldness spent in ONE place):** ripple-mark SVG in
the wordmark, a static waterline flourish plus italic serif tagline and
hairline-ruled numbered entries on the landing hero — and nowhere else.
Everything downstream stays quiet: flat surfaces (zero shadows, as
before), one stepper bar, survey-form radio rows, bank-style severity
panels. Confidence bands keep their text labels and gain decorative
depth dots (aria-hidden). Severity icons come from the already-present
lucide-react (OctagonX / TriangleAlert / Info / Check / EyeOff).

**Principles:** copy is frozen (no string changes); disclaimers keep
size and placement intent and gain a caution-band treatment, never less
weight; meaning distinctions (severity, bands, abstention, decision
badges) are restyled, never blurred; data flow, API, and logic untouched.

## 2. Self-critique against the generic tells (before building)

- _"Pale background + single accent is just cream+terracotta hue-shifted."_
  Fair risk. Answered with subject-matter motifs, not palette alone:
  ripple wordmark, waterline hero, serif entry numerals, segment
  stepper, survey-form banks, caution-band disclaimers. Teal is creek
  water; amber/red are the domain's own caution colors. The after-shots
  were judged against this: the landing no longer reads as a template.
- _Rounded-card kit with identical shadows._ No shadows existed; none
  added. Surfaces differentiate by wash/border/bank. Steps are ruled
  entries, not cards.
- _ALL-CAPS eyebrows / middle-dot meta / monospace data / arrow
  buttons._ None existed except the FHIR counts line (`0 errors ·
27 warnings`), which was rebuilt as labeled rows — the tell is gone
  rather than worked around.
- _Cute at the expense of clarity (11.3)._ Motifs live only in
  header/hero/severity chrome, never inside question text; every
  user-facing string is byte-identical.

## 3. Screenshots (before → after)

Source: temporary `zz-shots.spec.ts` (seeded demo data, messy + clean
drafts, live FHIR validation; deleted after the runs, never committed).
Full-page, 1280px width:

| screen                          | before                                    | after                                    |
| ------------------------------- | ----------------------------------------- | ---------------------------------------- |
| landing                         | `screenshots-redesign/before/landing.png` | `screenshots-redesign/after/landing.png` |
| about                           | `before/about.png`                        | `after/about.png`                        |
| assess/new                      | `before/new.png`                          | `after/new.png`                          |
| wizard (+ AI panels)            | `before/wizard.png`                       | `after/wizard.png`                       |
| review (error+2 warnings+info)  | `before/review.png`                       | `after/review.png`                       |
| done (bundle + live validation) | `before/done.png`                         | `after/done.png`                         |
| insights (empty)                | `before/insights.png`                     | `after/insights.png`                     |
| insights (demo data)            | `before/insights-demo.png`                | `after/insights-demo.png`                |

Notable observations from the after-shots: the stepper fills 2/4, 3/4,
4/4 correctly per step; selected options show bank + check; AI panels
render chip + dots + Why?; abstentions show the EyeOff note; the done
page validated live against HAPI (0 errors, 27 warnings — pre-existing
validator notes, unchanged). A real find during review: before-shots
rendered body copy in serif — the Geist `--font-geist-sans` variable was
never wired to `--font-sans`, so `font-sans` resolved to fallback. The
redesign defines `--font-sans` explicitly (Geist first, system stacks
after), which the after-shots confirm: sans body, serif display.

## 4. Accessibility and e2e (still green)

```
$ pnpm exec playwright test tests/e2e/axe.spec.ts --reporter=list
  4 passed (landing, new, wizard, insights — zero serious/critical)
$ pnpm exec playwright test --reporter=list --workers=1
  8 passed (all specs incl. happy-path, ai-suggest, smell-warning, exif-strip)
```

Environment note (not a product issue): parallel runs (`--workers=7/2`)
collapsed on this machine — orphaned headless-Chrome processes from
earlier killed runs saturated it (page-setup timeouts, disposed request
contexts, shared-file-DB contention). After killing 8 orphaned browsers,
the full suite passes serially; a lone re-run of the one suspicious
failure (smell-warning radio assertion) also passed, ruling out a
design regression. Tap targets (≥44px), visible focus rings
(now teal), `role=alert`/`aria-live` paths, and keyboard flows are
unchanged. No animations exist, so `prefers-reduced-motion` has nothing
new to govern; all SVGs are decorative (`aria-hidden`).

## 5. What was deliberately NOT done (restraint)

- No dark-mode toggle (tokens kept coherent anyway), no webfonts (system
  stacks only — deterministic in offline test browsers too), no motion,
  no shadows, no new pages/routes/components, no copy edits, no logic or
  data-flow changes (`src/components/ui/button.tsx` untouched).
- The hero waterline and entry numerals appear once (landing), not
  repeated per page; downstream screens differ only in type, banks, and
  washes.
- No ADR: visual-only, architecture untouched. Component markup changed
  (classes, icons, segment bar) but props, contracts, and the
  `domain ← server ← app` dependency rule are intact.

## Commits in this pass

- `37457fb` style(theme): creek-paper tokens, display serif, severity washes
- `17c5e34` style(landing): field-notebook chrome, hero waterline, ruled steps
- `38a24aa` style(wizard): survey-form options, field-note AI panels, ford stepper
- `55ac748` style(review): bank severity system; done and insights display pass
- this commit: docs(verification) + screenshots + D-06 question log
