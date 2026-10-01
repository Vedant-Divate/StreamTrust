"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CircleAlert, Info, OctagonX } from "lucide-react";
import { COPY } from "@/domain/copy";

interface ValidationResult {
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: { severity: string; code?: string; diagnostics?: string }[];
  validatorBaseUrl: string;
}

export default function Done() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [view, setView] = useState<unknown>(null);
  const [loadError, setLoadError] = useState("");
  const [bundle, setBundle] = useState<unknown>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/assessments/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json() as Promise<{ assessment: { status: string } } & Record<string, unknown>>;
      })
      .then(
        (data) => {
          if (cancelled) return;
          if (data.assessment.status !== "submitted") {
            router.replace(`/assess/${id}/review`);
            return;
          }
          setView(data);
          fetch(`/api/assessments/${id}/fhir`).then(
            (bundleRes) => {
              if (bundleRes.ok) {
                bundleRes.json().then((b: unknown) => {
                  if (!cancelled) setBundle(b);
                });
              }
            },
            () => {}
          );
        },
        () => {
          if (!cancelled) setLoadError(COPY.loadError);
        }
      );
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  function download() {
    if (!view) return;
    const blob = new Blob([JSON.stringify(view, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadBundle() {
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-${id}-fhir.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function validate() {
    setValidating(true);
    setValidationError("");
    try {
      const res = await fetch(`/api/assessments/${id}/fhir/validate`, { method: "POST" });
      if (!res.ok) throw new Error("validate failed");
      setValidation((await res.json()) as ValidationResult);
    } catch {
      setValidationError(COPY.fhirValidateError);
    } finally {
      setValidating(false);
    }
  }

  if (loadError) return <p role="alert">{loadError}</p>;
  if (!view) return <p aria-live="polite">…</p>;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">{COPY.doneTitle}</h1>
      <p className="leading-relaxed">{COPY.doneText}</p>

      <section aria-labelledby="data-h" className="flex flex-col gap-3">
        <h2 id="data-h" className="font-display text-xl font-bold">
          {COPY.viewData}
        </h2>
        <details className="rounded-lg border p-4">
          <summary className="inline-flex min-h-[44px] cursor-pointer items-center font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Raw JSON
          </summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded bg-muted p-3 text-xs">
            {JSON.stringify(view, null, 2)}
          </pre>
        </details>
        <div>
          <button
            type="button"
            onClick={download}
            className="inline-flex min-h-[44px] items-center rounded-lg border px-5 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {COPY.downloadJson}
          </button>
        </div>
      </section>

      <section aria-labelledby="fhir-h" className="flex flex-col gap-3">
        <h2 id="fhir-h" className="font-display text-xl font-bold">
          {COPY.fhirBundleTitle}
        </h2>
        {bundle ? (
          <details className="rounded-lg border p-4">
            <summary className="inline-flex min-h-[44px] cursor-pointer items-center font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Bundle JSON
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded bg-muted p-3 text-xs">
              {JSON.stringify(bundle, null, 2)}
            </pre>
          </details>
        ) : (
          <p aria-live="polite" className="text-sm text-muted-foreground">
            …
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={downloadBundle}
            disabled={!bundle}
            className="inline-flex min-h-[44px] items-center rounded-lg border px-5 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {COPY.fhirDownloadBundle}
          </button>
          <button
            type="button"
            onClick={() => void validate()}
            disabled={validating}
            className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {validating ? COPY.fhirValidating : COPY.fhirValidateButton}
          </button>
        </div>
        <p className="rounded-lg border border-info/30 border-l-4 border-l-info bg-info-wash p-3 text-sm leading-relaxed">
          {COPY.fhirNotice}
        </p>
        <div aria-live="polite">
          {validationError && (
            <p role="alert" className="text-sm text-destructive">
              {validationError}
            </p>
          )}
          {validation && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <dl className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <OctagonX aria-hidden="true" className="h-4 w-4 text-destructive" />
                    {COPY.fhirErrors}
                  </dt>
                  <dd className="text-base font-semibold tabular-nums">{validation.errorCount}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <CircleAlert aria-hidden="true" className="h-4 w-4 text-warning" />
                    {COPY.fhirWarnings}
                  </dt>
                  <dd className="text-base font-semibold tabular-nums">
                    {validation.warningCount}
                  </dd>
                </div>
              </dl>
              {validation.issues.length === 0 ? (
                <p className="text-sm">{COPY.fhirNoIssues}</p>
              ) : (
                <ul className="flex max-h-64 flex-col gap-2 overflow-auto text-sm">
                  {validation.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {issue.severity === "error" ? (
                        <OctagonX
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                        />
                      ) : issue.severity === "warning" ? (
                        <CircleAlert
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                        />
                      ) : (
                        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                      )}
                      <span>
                        {issue.code ? `${issue.code}: ` : ""}
                        {issue.diagnostics ? issue.diagnostics.slice(0, 200) : issue.severity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      <nav aria-label="Next steps" className="flex gap-4">
        <Link
          href="/assess/new"
          className="inline-flex min-h-[44px] items-center rounded px-2 underline decoration-primary decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {COPY.startAssessment}
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center rounded px-2 underline decoration-primary decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {COPY.appName}
        </Link>
      </nav>
    </div>
  );
}
