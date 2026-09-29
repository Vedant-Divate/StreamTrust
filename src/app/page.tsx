import Link from "next/link";
import { COPY } from "@/domain/copy";

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{COPY.landingTitle}</h1>
        <p className="text-lg text-muted-foreground">{COPY.appTagline}</p>
        <p>{COPY.landingIntro}</p>
        <div>
          <Link
            href="/assess/new"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {COPY.startAssessment}
          </Link>
        </div>
      </section>

      <section aria-labelledby="how" className="flex flex-col gap-3">
        <h2 id="how" className="text-xl font-semibold">
          {COPY.howItWorks}
        </h2>
        <ol className="flex flex-col gap-3">
          <li className="rounded-lg border p-4">
            <h3 className="font-medium">{COPY.step1Title}</h3>
            <p className="text-muted-foreground">{COPY.step1Text}</p>
          </li>
          <li className="rounded-lg border p-4">
            <h3 className="font-medium">{COPY.step2Title}</h3>
            <p className="text-muted-foreground">{COPY.step2Text}</p>
          </li>
          <li className="rounded-lg border p-4">
            <h3 className="font-medium">{COPY.step3Title}</h3>
            <p className="text-muted-foreground">{COPY.step3Text}</p>
          </li>
        </ol>
      </section>

      <section
        aria-label="Disclaimers"
        className="flex flex-col gap-2 rounded-lg bg-muted p-4 text-sm"
      >
        <p>{COPY.disclaimerMonitoringOnly}</p>
        <p>{COPY.disclaimerAiCanBeWrong}</p>
      </section>

      <nav aria-label="More pages" className="flex flex-col gap-2 sm:flex-row sm:gap-4">
        <Link
          href="/about"
          className="inline-flex min-h-[44px] items-center rounded px-2 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {COPY.learnMore}
        </Link>
        <Link
          href="/insights"
          className="inline-flex min-h-[44px] items-center rounded px-2 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {COPY.viewInsights}
        </Link>
      </nav>
    </div>
  );
}
