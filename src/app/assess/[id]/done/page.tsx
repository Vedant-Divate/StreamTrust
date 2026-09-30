"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
      <h1 className="text-2xl font-semibold tracking-tight">{COPY.doneTitle}</h1>
      <p>{COPY.doneText}</p>

      <section aria-labelledby="data-h" className="flex flex-col gap-3">
        <h2 id="data-h" className="text-xl font-semibold">
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
        <h2 id="fhir-h" className="text-xl font-semibold">
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
        <p className="rounded-lg bg-muted p-3 text-sm">{COPY.fhirNotice}</p>
        <div aria-live="polite">
          {validationError && (
            <p role="alert" className="text-sm text-destructive">
              {validationError}
            </p>
          )}
          {validation && (
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <p className="font-medium">
                {validation.errorCount} {COPY.fhirErrors} · {validation.warningCount}{" "}
                {COPY.fhirWarnings}
              </p>
              {validation.issues.length === 0 ? (
                <p className="text-sm">{COPY.fhirNoIssues}</p>
              ) : (
                <ul className="flex max-h-64 flex-col gap-1 overflow-auto text-sm">
                  {validation.issues.map((issue, i) => (
                    <li key={i}>
                      [{issue.severity}]{issue.code ? ` ${issue.code}` : ""}
                      {issue.diagnostics ? `: ${issue.diagnostics.slice(0, 200)}` : ""}
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
          className="inline-flex min-h-[44px] items-center rounded px-2 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {COPY.startAssessment}
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center rounded px-2 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {COPY.appName}
        </Link>
      </nav>
    </div>
  );
}
