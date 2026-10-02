"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Info, OctagonX, TriangleAlert } from "lucide-react";
import { COPY } from "@/domain/copy";
import { INDICATORS } from "@/domain/vocab";
import { ProgressSteps, WizardNav } from "@/components/wizard/ProgressSteps";

interface Entry {
  indicator: string;
  finalValue: string;
}

interface ValidationResult {
  ruleId: string;
  severity: "error" | "warning" | "info";
  indicators: string[];
  message: string;
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
  const [results, setResults] = useState<ValidationResult[] | null>(null);
  const [waiver, setWaiver] = useState(false);
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (!view) return;
    let cancelled = false;
    fetch(`/api/assessments/${id}/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ photo_waiver: waiver }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("validate failed");
        return res.json() as Promise<{ results: ValidationResult[] }>;
      })
      .then(
        (data) => {
          if (!cancelled) setResults(data.results);
        },
        () => {
          if (!cancelled) setResults([]);
        }
      );
    return () => {
      cancelled = true;
    };
  }, [id, view, waiver]);

  async function acknowledge(ruleId: string) {
    const res = await fetch(`/api/assessments/${id}/acks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rule_id: ruleId }),
    });
    if (res.ok) setAcked((prev) => new Set(prev).add(ruleId));
  }

  async function onSubmit() {
    setSubmitting(true);
    setStatus("");
    const revalidate = async () => {
      try {
        const res = await fetch(`/api/assessments/${id}/validate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ photo_waiver: waiver }),
        });
        if (res.ok) {
          const data = (await res.json()) as { results: ValidationResult[] };
          setResults(data.results);
        }
      } catch {
        // Validation display is best-effort; submit enforces server-side.
      }
    };
    try {
      const res = await fetch(`/api/assessments/${id}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photo_waiver: waiver }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string; details?: unknown };
        } | null;
        await revalidate();
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
  const errors = (results ?? []).filter((r) => r.severity === "error");
  const warnings = (results ?? []).filter((r) => r.severity === "warning");
  const infos = (results ?? []).filter((r) => r.severity === "info" && !dismissed.has(r.ruleId));
  const showWaiver = view.photos.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <ProgressSteps step={4} of={4} />
        <h1 className="font-display text-2xl font-bold tracking-tight">{COPY.assessReviewTitle}</h1>
      </div>

      <section aria-label="Visit details" className="rounded-lg border border-border bg-card p-4">
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
        {showWaiver && (
          <div className="mt-3 flex items-start gap-3 rounded-lg border p-3">
            <input
              id="waiver"
              type="checkbox"
              checked={waiver}
              onChange={(e) => setWaiver(e.target.checked)}
              className="mt-1 h-6 w-6 shrink-0 accent-primary"
            />
            <label htmlFor="waiver" className="cursor-pointer text-sm">
              {COPY.waiverLabel}
            </label>
          </div>
        )}
      </section>

      <section aria-label="Answers" className="flex flex-col gap-2">
        <dl className="flex flex-col gap-2">
          {INDICATORS.map((d, i) => {
            const entry = valueOf(d.code);
            const label = entry ? (d.values.find((v) => v.code === entry)?.label ?? entry) : "—";
            return (
              <div
                key={d.code}
                className="flex items-baseline gap-3 rounded-lg border border-border bg-card p-3"
              >
                <span
                  aria-hidden="true"
                  className="font-display text-lg font-bold tabular-nums text-primary/60"
                >
                  {i + 1}
                </span>
                <dt className="text-sm text-muted-foreground">{d.label}</dt>
                <dd className="ml-auto text-right font-medium">{label}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      {errors.length > 0 && (
        <section
          aria-label={COPY.errorsTitle}
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-destructive/40 border-l-4 border-l-destructive bg-destructive-wash p-4"
        >
          <h2 className="flex items-center gap-2 font-semibold text-destructive">
            <OctagonX aria-hidden="true" className="h-5 w-5 shrink-0" />
            {COPY.errorsTitle}
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {errors.map((r) => (
              <li key={r.ruleId}>{r.message}</li>
            ))}
          </ul>
        </section>
      )}

      {warnings.length > 0 && (
        <section aria-label={COPY.warningsTitle} className="flex flex-col gap-3">
          <h2 className="font-semibold">{COPY.warningsTitle}</h2>
          {warnings.map((w) => (
            <div
              key={w.ruleId}
              className="flex flex-col gap-2 rounded-lg border border-warning/40 border-l-4 border-l-warning bg-warning-wash p-3"
            >
              <p className="flex items-start gap-2 text-sm font-medium text-warning">
                <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{w.message}</span>
              </p>
              {acked.has(w.ruleId) ? (
                <p className="text-sm font-medium">✓ {COPY.acknowledgedLabel}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => void acknowledge(w.ruleId)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {COPY.acknowledgeButton}
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {infos.length > 0 && (
        <section aria-label={COPY.infoTitle} className="flex flex-col gap-2">
          <h2 className="font-semibold">{COPY.infoTitle}</h2>
          {infos.map((info) => (
            <div
              key={info.ruleId}
              className="flex flex-col gap-1 rounded-lg border border-info/30 border-l-4 border-l-info bg-info-wash p-3"
            >
              <p className="flex items-start gap-2 text-sm">
                <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                <span>{info.message}</span>
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setDismissed((prev) => new Set(prev).add(info.ruleId))}
                  className="inline-flex min-h-[44px] items-center rounded px-2 text-sm underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {COPY.dismissButton}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {!complete && (
        <p role="alert" className="rounded-lg bg-muted p-3 text-sm">
          {COPY.missingAnswers} ({missing.length} left)
        </p>
      )}
      <p aria-live="polite" className="min-h-[1.5rem] text-sm text-destructive">
        {status}
      </p>

      <WizardNav backFallback={`/assess/${id}`} />
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
