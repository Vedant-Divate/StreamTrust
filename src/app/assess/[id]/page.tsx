"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { COPY } from "@/domain/copy";
import {
  INDICATORS,
  NOT_APPLICABLE,
  NOT_APPLICABLE_INDICATORS,
  type IndicatorCode,
} from "@/domain/vocab";
import { IndicatorCard } from "@/components/wizard/IndicatorCard";
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
}

export default function Wizard() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<View | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

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

  async function saveEntries(entries: { indicator: string; final_value: string }[]) {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/assessments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error("save failed");
      const updated = (await res.json()) as View;
      setView(updated);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function selectValue(indicator: IndicatorCode, value: string) {
    const entries: { indicator: string; final_value: string }[] = [
      { indicator, final_value: value },
    ];
    if (indicator === "flow" && value === "dry") {
      for (const other of NOT_APPLICABLE_INDICATORS) {
        entries.push({ indicator: other, final_value: NOT_APPLICABLE });
      }
    }
    void saveEntries(entries);
  }

  if (loadError) return <p role="alert">{loadError}</p>;
  if (!view) return <p aria-live="polite">…</p>;

  const valueOf = (code: string) => view.entries.find((e) => e.indicator === code)?.finalValue;
  const flowDry = valueOf("flow") === "dry";

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="photos-h" className="flex flex-col gap-3">
        <ProgressSteps step={2} of={4} />
        <h1 id="photos-h" className="text-2xl font-semibold tracking-tight">
          {COPY.assessPhotosTitle}
        </h1>
        <p className="text-muted-foreground">{COPY.photoHelp}</p>
        <PhotoUploader assessmentId={id} photos={view.photos} onChanged={() => void refresh()} />
      </section>

      <section aria-labelledby="indicators-h" className="flex flex-col gap-4">
        <ProgressSteps step={3} of={4} />
        <h2 id="indicators-h" className="text-2xl font-semibold tracking-tight">
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
        {INDICATORS.map((def) => (
          <IndicatorCard
            key={def.code}
            def={def}
            value={valueOf(def.code)}
            onSelect={(v) => selectValue(def.code, v)}
          />
        ))}
      </section>

      <WizardNav backHref="/" nextHref={`/assess/${id}/review`} nextLabel={COPY.reviewButton} />
    </div>
  );
}
