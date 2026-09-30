"use client";

import { COPY } from "@/domain/copy";
import type { ConfidenceBand } from "@/domain/types";

// Abstention sentinel. UI code must not import from src/server/**, so the
// literal is repeated here; src/server/ai/normalize.ts remains the source
// of truth that produces it.
const CANNOT_DETERMINE = "cannot_determine";

export interface SuggestionView {
  indicator: string;
  suggested_value: string;
  confidence_band: string;
  evidence: string;
  cues: string[];
}

function bandLabel(band: string): string {
  if (band === "low") return COPY.bandLow;
  if (band === "medium") return COPY.bandMedium;
  return COPY.bandHigh;
}

export function AiSuggestionPanel({
  suggestion,
  onUse,
}: {
  suggestion: SuggestionView | undefined;
  onUse: (value: string) => void;
}) {
  if (!suggestion || suggestion.suggested_value === CANNOT_DETERMINE) {
    return (
      <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{COPY.aiCantTell}</p>
    );
  }
  const band = suggestion.confidence_band as ConfidenceBand;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
          AI suggests: {suggestion.suggested_value.replace(/_/g, " ")}
        </span>
        <span
          title={COPY.bandTooltip}
          className="rounded-full border px-3 py-1 text-sm text-muted-foreground"
        >
          {bandLabel(band)}
        </span>
      </div>
      <details>
        <summary className="inline-flex min-h-[44px] cursor-pointer items-center rounded text-sm underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          {COPY.whyLabel}
        </summary>
        <p className="pt-1 text-sm">{suggestion.evidence || "No reason given."}</p>
        {suggestion.cues.length > 0 && (
          <ul className="list-disc pl-5 pt-1 text-sm text-muted-foreground">
            {suggestion.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        )}
      </details>
      <div>
        <button
          type="button"
          onClick={() => onUse(suggestion.suggested_value)}
          className="inline-flex min-h-[44px] items-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {COPY.useSuggestion}
        </button>
      </div>
    </div>
  );
}
