"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { COPY } from "@/domain/copy";
import { INDICATORS } from "@/domain/vocab";
import { ProgressSteps, WizardNav } from "@/components/wizard/ProgressSteps";

interface Entry {
  indicator: string;
  finalValue: string;
}

interface View {
  assessment: {
    id: string;
    status: string;
    observedAt: string;
    rainLast24h: string;
    notes: string | null;
  };
  site: { name: string | null; lat: number; lng: number };
  entries: Entry[];
  photos: { id: string }[];
}

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/assessments/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json() as Promise<View>;
      })
      .then(
        (data) => {
          if (cancelled) return;
          if (data.assessment.status === "submitted") {
            router.replace(`/assess/${id}/done`);
            return;
          }
          setView(data);
        },
        () => {
          if (!cancelled) setLoadError(COPY.loadError);
        }
      );
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  async function onSubmit() {
    setSubmitting(true);
    setStatus("");
    try {
      const res = await fetch(`/api/assessments/${id}/submit`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? COPY.submitError);
      }
      router.push(`/assess/${id}/done`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : COPY.submitError);
      setSubmitting(false);
    }
  }

  if (loadError) return <p role="alert">{loadError}</p>;
  if (!view) return <p aria-live="polite">…</p>;

  const valueOf = (code: string) => view.entries.find((e) => e.indicator === code)?.finalValue;
  const missing = INDICATORS.filter((d) => !valueOf(d.code));
  const complete = missing.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <ProgressSteps step={4} of={4} />
        <h1 className="text-2xl font-semibold tracking-tight">{COPY.assessReviewTitle}</h1>
      </div>

      <section aria-label="Visit details" className="rounded-lg border p-4">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Place</dt>
          <dd>{view.site.name ?? `${view.site.lat}, ${view.site.lng}`}</dd>
          <dt className="text-muted-foreground">Visited</dt>
          <dd>{new Date(view.assessment.observedAt).toLocaleString()}</dd>
          <dt className="text-muted-foreground">Rain</dt>
          <dd>{view.assessment.rainLast24h}</dd>
          <dt className="text-muted-foreground">Photos</dt>
          <dd>{view.photos.length}</dd>
        </dl>
        {view.assessment.notes && <p className="pt-2 text-sm">{view.assessment.notes}</p>}
      </section>

      <section aria-label="Answers" className="flex flex-col gap-2">
        <dl className="flex flex-col gap-2">
          {INDICATORS.map((d) => {
            const entry = valueOf(d.code);
            const label = entry ? (d.values.find((v) => v.code === entry)?.label ?? entry) : "—";
            return (
              <div
                key={d.code}
                className="flex items-baseline justify-between gap-3 rounded-lg border p-3"
              >
                <dt className="text-sm text-muted-foreground">{d.label}</dt>
                <dd className="text-right font-medium">{label}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      {!complete && (
        <p role="alert" className="rounded-lg bg-muted p-3 text-sm">
          {COPY.missingAnswers} ({missing.length} left)
        </p>
      )}
      <p aria-live="polite" className="min-h-[1.5rem] text-sm text-destructive">
        {status}
      </p>

      <WizardNav backHref={`/assess/${id}`} />
      <button
        type="button"
        onClick={() => void onSubmit()}
        disabled={!complete || submitting}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
      >
        {submitting ? COPY.submitting : COPY.submitButton}
      </button>
    </div>
  );
}
