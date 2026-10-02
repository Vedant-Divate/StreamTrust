"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { COPY } from "@/domain/copy";
import {
  INDICATORS,
  NOT_APPLICABLE,
  NOT_APPLICABLE_INDICATORS,
  type IndicatorCode,
} from "@/domain/vocab";
import { IndicatorCard } from "@/components/wizard/IndicatorCard";
import { AiSuggestionPanel, type SuggestionView } from "@/components/wizard/AiSuggestionPanel";
import { PhotoUploader, type PhotoMeta } from "@/components/wizard/PhotoUploader";
import { ProgressSteps, WizardNav } from "@/components/wizard/ProgressSteps";

interface Entry {
  indicator: string;
  finalValue: string;
}

interface View {
  assessment: { id: string; status: string };
  entries: Entry[];
  photos: PhotoMeta[];
  suggestions: SuggestionView[];
}

export default function Wizard() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<View | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [suggestState, setSuggestState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [suggestError, setSuggestError] = useState<string>(COPY.suggestionsFailed);
  // Autosaves can overlap when the user answers quickly. Only the latest
  // response may update the view; stale ones are dropped so the UI (and
  // the "saved" flag) never reflects an older server state.
  const saveSeq = useRef(0);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/assessments/${id}`);
    if (!res.ok) {
      setLoadError(COPY.loadError);
      setView(null);
      return;
    }
    setView((await res.json()) as View);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/assessments/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json() as Promise<View>;
      })
      .then(
        (data) => {
          if (!cancelled) setView(data);
        },
        () => {
          if (!cancelled) {
            setLoadError(COPY.loadError);
            setView(null);
          }
        }
      );
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function saveEntries(
    entries: { indicator: string; final_value: string | null }[],
    rollback = false
  ) {
    const seq = ++saveSeq.current;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/assessments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error("save failed");
      const updated = (await res.json()) as View;
      if (seq === saveSeq.current) {
        setView(updated);
        setSaveState("saved");
      }
    } catch {
      if (seq === saveSeq.current) {
        setSaveState("error");
        // Roll back the optimistic update so the UI never shows a value
        // the server rejected. A newer in-flight save reconciles itself.
        if (rollback) void refresh();
      }
    }
  }

  function selectValue(indicator: IndicatorCode, value: string) {
    const entries: { indicator: string; final_value: string | null }[] = [
      { indicator, final_value: value },
    ];
    if (indicator === "flow" && value === "dry") {
      for (const other of NOT_APPLICABLE_INDICATORS) {
        entries.push({ indicator: other, final_value: NOT_APPLICABLE });
      }
    }
    if (indicator === "flow" && value !== "dry" && view) {
      // Leaving `dry`: clear stale `not_applicable` values so the human
      // answers those questions again instead of submitting stale data.
      for (const other of NOT_APPLICABLE_INDICATORS) {
        if (view.entries.find((e) => e.indicator === other)?.finalValue === NOT_APPLICABLE) {
          entries.push({ indicator: other, final_value: null });
        }
      }
    }
    // Optimistic: reflect the choice instantly instead of waiting for the
    // PATCH round-trip (which is what made selections feel laggy). The
    // response reconciles afterwards; a failure rolls back (see above).
    setView((prev) => {
      if (!prev) return prev;
      const next = new Map(prev.entries.map((e) => [e.indicator, e.finalValue]));
      for (const e of entries) {
        if (e.final_value === null) next.delete(e.indicator);
        else next.set(e.indicator, e.final_value);
      }
      return {
        ...prev,
        entries: [...next].map(([ind, val]) => ({ indicator: ind, finalValue: val })),
      };
    });
    void saveEntries(entries, true);
  }

  async function requestSuggestions() {
    setSuggestState("loading");
    try {
      const res = await fetch(`/api/assessments/${id}/suggest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? COPY.suggestionsFailed);
      }
      await refresh();
      setSuggestState("done");
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : COPY.suggestionsFailed);
      setSuggestState("error");
    }
  }

  if (loadError) return <p role="alert">{loadError}</p>;
  if (!view) return <p aria-live="polite">…</p>;

  const valueOf = (code: string) => view.entries.find((e) => e.indicator === code)?.finalValue;
  const suggestionOf = (code: string) =>
    [...view.suggestions].reverse().find((s) => s.indicator === code);
  const flowDry = valueOf("flow") === "dry";

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="photos-h" className="flex flex-col gap-3">
        <ProgressSteps step={2} of={4} />
        <h1 id="photos-h" className="font-display text-2xl font-bold tracking-tight">
          {COPY.assessPhotosTitle}
        </h1>
        <p className="text-muted-foreground">{COPY.photoHelp}</p>
        <PhotoUploader assessmentId={id} photos={view.photos} onChanged={() => void refresh()} />
      </section>

      <section aria-labelledby="indicators-h" className="flex flex-col gap-4">
        <ProgressSteps step={3} of={4} />
        <h2 id="indicators-h" className="font-display text-2xl font-bold tracking-tight">
          {COPY.assessIndicatorsTitle}
        </h2>
        <p aria-live="polite" className="min-h-[1.5rem] text-sm text-muted-foreground">
          {saveState === "saving"
            ? COPY.savingDraft
            : saveState === "saved"
              ? COPY.savedDraft
              : saveState === "error"
                ? COPY.saveError
                : ""}
        </p>
        {flowDry && <p className="rounded-lg bg-muted p-3 text-sm">{COPY.dryNote}</p>}
        {view.photos.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void requestSuggestions()}
              disabled={suggestState === "loading"}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border px-4 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
            >
              {suggestState === "loading" ? COPY.suggestionsLoading : COPY.getSuggestions}
            </button>
            <p aria-live="polite" className="min-h-[1.5rem] text-sm text-muted-foreground">
              {suggestState === "error" ? suggestError : ""}
            </p>
          </div>
        )}
        {INDICATORS.map((def) => (
          <div key={def.code} className="flex flex-col gap-2">
            <IndicatorCard
              def={def}
              value={valueOf(def.code)}
              onSelect={(v) => selectValue(def.code, v)}
            />
            {/* Once a suggestion round exists, every indicator gets its
                panel slot: a row the model skipped renders the abstention
                note ("AI can't tell…") instead of silent nothing, so a
                missing suggestion is never mistaken for a missing feature.
                AiSuggestionPanel already maps undefined to the note. */}
            {view.suggestions.length > 0 && (
              <AiSuggestionPanel
                suggestion={suggestionOf(def.code)}
                onUse={(v) => selectValue(def.code, v)}
              />
            )}
          </div>
        ))}
      </section>

      <WizardNav backFallback="/" nextHref={`/assess/${id}/review`} nextLabel={COPY.reviewButton} />
    </div>
  );
}
