"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { COPY } from "@/domain/copy";

export default function Done() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [view, setView] = useState<unknown>(null);
  const [loadError, setLoadError] = useState("");

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
