/**
 * AI evaluation smoke test (PROJECT.md Section 8.7).
 *
 * Usage (manual only — never in CI; needs a live provider key):
 *   $env:NIM_API_KEY="nvapi-..."; pnpm eval:ai
 *   AI_MODEL=meta/llama-3.2-11b-vision-instruct pnpm eval:ai
 *
 * Reads tests/fixtures/eval/*.jpg + labels.csv (team-labelled, rights in
 * ATTRIBUTIONS.md), calls the provider once per image, and scores
 * per-indicator suggestions against the labels. Writes
 * docs/verification/eval-results.md. Small sample, team-labelled; a
 * smoke test, not a benchmark — that caveat is part of the output file.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PROMPT_VERSION } from "../src/server/ai/prompt";
import { NimProvider } from "../src/server/ai/nim-provider";
import { normalizeSuggestions } from "../src/server/ai/normalize";

const FIXTURES = join(__dirname, "fixtures", "eval");
const OUT = join(__dirname, "..", "docs", "verification", "eval-results.md");

interface Label {
  image: string;
  indicator: string;
  label: string;
}

function loadLabels(): Label[] {
  const lines = readFileSync(join(FIXTURES, "labels.csv"), "utf8").trim().split("\n");
  const header = lines.shift()!.split(",");
  if (header.join(",") !== "image,indicator,label") {
    throw new Error(`Unexpected labels.csv header: ${header.join(",")}`);
  }
  return lines.map((line) => {
    const [image, indicator, label] = line.split(",");
    return { image, indicator, label };
  });
}

async function main() {
  const labels = loadLabels();
  const images = [...new Set(labels.map((l) => l.image))].sort();
  const provider = new NimProvider();
  console.log(`model=${provider.model} images=${images.length} labels=${labels.length}`);

  let decided = 0;
  let agreed = 0;
  let abstained = 0;
  let errored = 0;
  const perIndicator = new Map<string, { decided: number; agreed: number; abstained: number }>();
  const rows: string[] = [];

  for (const image of images) {
    const bytes = readFileSync(join(FIXTURES, image));
    let suggestions: ReturnType<typeof normalizeSuggestions> = [];
    try {
      const raw = await provider.suggest({
        images: [{ mime: "image/jpeg", base64: bytes.toString("base64") }],
        rainLast24h: "unknown",
        promptVersion: PROMPT_VERSION,
      });
      suggestions = normalizeSuggestions(raw);
    } catch (err) {
      errored += 1;
      rows.push(`| ${image} | — | provider error: ${(err as Error).message} |`);
      continue;
    }
    for (const { indicator, label } of labels.filter((l) => l.image === image)) {
      const stat = perIndicator.get(indicator) ?? { decided: 0, agreed: 0, abstained: 0 };
      const hit = suggestions.find((s) => s.indicator === indicator);
      if (!hit || hit.suggestedValue === "cannot_determine") {
        abstained += 1;
        stat.abstained += 1;
      } else {
        decided += 1;
        stat.decided += 1;
        if (hit.suggestedValue === label) {
          agreed += 1;
          stat.agreed += 1;
        } else {
          rows.push(`| ${image} | ${indicator} | label ${label}, got ${hit.suggestedValue} |`);
        }
      }
      perIndicator.set(indicator, stat);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  const pct = (a: number, b: number) => (b === 0 ? "n/a" : `${((a / b) * 100).toFixed(1)}%`);
  const lines = [
    "# AI evaluation results (smoke test)",
    "",
    "> Small sample, team-labelled; a smoke test, not a benchmark.",
    "",
    `- Date: ${new Date().toISOString()}`,
    `- Provider: nim, model: ${provider.model}, prompt: ${PROMPT_VERSION}`,
    `- Images: ${images.length}, labels: ${labels.length}`,
    `- Decided: ${decided}, agreed: ${agreed} (${pct(agreed, decided)})`,
    `- Abstained: ${abstained}, provider errors: ${errored}`,
    "",
    "## Per-indicator agreement",
    "",
    "| indicator | decided | agreed | agreement | abstained |",
    "|---|---|---|---|---|",
    ...[...perIndicator.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([ind, s]) =>
          `| ${ind} | ${s.decided} | ${s.agreed} | ${pct(s.agreed, s.decided)} | ${s.abstained} |`
      ),
    "",
    "## Mismatches and errors",
    "",
    ...(rows.length > 0 ? rows : ["(none — every decided suggestion matched)"]),
    "",
  ];
  writeFileSync(OUT, lines.join("\n"));
  console.log(`decided=${decided} agreed=${agreed} abstained=${abstained} errors=${errored}`);
  console.log(`wrote ${OUT}`);
}

main().catch((err) => {
  console.error("EVAL_FAILED", err);
  process.exit(1);
});
