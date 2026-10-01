"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Droplets, TriangleAlert } from "lucide-react";
import { COPY } from "@/domain/copy";
import { INDICATORS } from "@/domain/vocab";
import { AgreementChart } from "@/components/insights/AgreementChart";
import { OverrideTable } from "@/components/insights/OverrideTable";

// Server response shape, repeated locally: UI code must not import
// from src/server/** (dependency rule), so this mirrors the API output.
interface AgreementSummary {
  pairs: number;
  agreed: number;
  rate: number | null;
  overrides: number;
  byIndicator: {
    indicator: string;
    pairs: number;
    agreed: number;
    rate: number | null;
    overrides: number;
  }[];
  byBand: { band: string; pairs: number; agreed: number; rate: number | null }[];
}

// UI must not import server code: the shape is repeated locally.
interface InsightsResponse {
  demo: "include" | "only" | "exclude";
  summary: AgreementSummary;
}

const BAND_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  none: "Abstained",
};

export default function Insights() {
  return (
    <Suspense fallback={<p aria-live="polite">…</p>}>
      <InsightsBody />
    </Suspense>
  );
}

function InsightsBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const includeDemo = searchParams.get("demo") === "include";
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/insights?demo=${includeDemo ? "include" : "exclude"}`)
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json() as Promise<InsightsResponse>;
      })
      .then(
        (data) => {
          if (!cancelled) setData(data);
        },
        () => {
          if (!cancelled) setLoadError(true);
        }
      );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function toggleDemo(checked: boolean) {
    router.replace(`/insights${checked ? "?demo=include" : ""}`);
  }

  const labelOf = (code: string) => INDICATORS.find((d) => d.code === code)?.label ?? code;

  if (loadError) return <p role="alert">{COPY.submitError}</p>;

  const summary = data?.summary;
  const showDemoBadge = includeDemo;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{COPY.insightsTitle}</h1>
        <p className="text-muted-foreground">{COPY.insightsIntro}</p>
      </div>

      {showDemoBadge && (
        <p
          role="note"
          aria-label={`${COPY.demoBadge}: ${COPY.demoDataNotice}`}
          className="flex items-center gap-2 rounded-lg border border-warning/40 border-l-4 border-l-warning bg-warning-wash p-4 text-center font-semibold"
        >
          <TriangleAlert aria-hidden="true" className="h-5 w-5 shrink-0 text-warning" />
          {COPY.demoDataNotice}
        </p>
      )}

      <div className="flex items-center gap-3 rounded-lg border p-3">
        <input
          id="include-demo"
          type="checkbox"
          checked={includeDemo}
          onChange={(e) => toggleDemo(e.target.checked)}
          className="h-6 w-6 shrink-0 accent-primary"
        />
        <label htmlFor="include-demo" className="min-h-[44px] inline-flex items-center text-sm">
          {COPY.includeDemo}
        </label>
      </div>

      <div aria-live="polite" className="flex flex-col gap-6">
        {!summary ? (
          <p>…</p>
        ) : summary.pairs === 0 ? (
          <div className="flex flex-col gap-3 rounded-lg border border-info/30 border-l-4 border-l-info bg-info-wash p-4">
            <p className="flex items-start gap-2 text-sm leading-relaxed">
              <Droplets aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <span>{COPY.noInsightsData}</span>
            </p>
            <Link
              href="/assess/new"
              className="inline-flex min-h-[44px] items-center self-start rounded px-2 underline decoration-primary decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {COPY.startAssessment}
            </Link>
          </div>
        ) : (
          <>
            <section aria-label="Summary" className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="font-display text-3xl font-bold tabular-nums">
                  {summary.rate === null ? "—" : `${summary.rate}%`}
                </p>
                <p className="text-sm text-muted-foreground">{COPY.agreementRate}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="font-display text-3xl font-bold tabular-nums">{summary.pairs}</p>
                <p className="text-sm text-muted-foreground">{COPY.comparedAnswers}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="font-display text-3xl font-bold tabular-nums">{summary.overrides}</p>
                <p className="text-sm text-muted-foreground">{COPY.changedAnswers}</p>
              </div>
            </section>

            <section aria-labelledby="by-q" className="flex flex-col gap-3">
              <h2 id="by-q" className="font-display text-xl font-bold">
                {COPY.byIndicatorTitle}
              </h2>
              <AgreementChart
                items={summary.byIndicator.map((s) => ({
                  key: s.indicator,
                  label: labelOf(s.indicator),
                  detail: `${s.agreed}/${s.pairs}`,
                  rate: s.rate,
                }))}
              />
            </section>

            <section aria-labelledby="by-band" className="flex flex-col gap-3">
              <h2 id="by-band" className="font-display text-xl font-bold">
                {COPY.bandTitle}
              </h2>
              <AgreementChart
                items={summary.byBand.map((s) => ({
                  key: s.band,
                  label: BAND_LABELS[s.band] ?? s.band,
                  detail: `${s.agreed}/${s.pairs}`,
                  rate: s.rate,
                }))}
              />
            </section>

            <section aria-labelledby="overrides" className="flex flex-col gap-3">
              <h2 id="overrides" className="font-display text-xl font-bold">
                {COPY.overridesTitle}
              </h2>
              <OverrideTable
                rows={summary.byIndicator.map((s) => ({
                  indicator: s.indicator,
                  label: labelOf(s.indicator),
                  overrides: s.overrides,
                  pairs: s.pairs,
                }))}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
