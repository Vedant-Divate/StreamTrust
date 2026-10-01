import Link from "next/link";
import { COPY } from "@/domain/copy";

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-bold tracking-tight text-balance">
          {COPY.landingTitle}
        </h1>
        <svg viewBox="0 0 320 20" fill="none" aria-hidden="true" className="h-5 w-48 text-primary">
          <path
            d="M2 5q8-6 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M18 13q8-6 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.45"
          />
        </svg>
        <p className="font-display text-xl text-muted-foreground italic">{COPY.appTagline}</p>
        <p className="text-base leading-relaxed">{COPY.landingIntro}</p>
        <div>
          <Link
            href="/assess/new"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {COPY.startAssessment}
          </Link>
        </div>
      </section>

      <section aria-labelledby="how" className="flex flex-col">
        <h2 id="how" className="font-display text-2xl font-bold tracking-tight">
          {COPY.howItWorks}
        </h2>
        <ol className="flex flex-col">
          {[
            [COPY.step1Title, COPY.step1Text],
            [COPY.step2Title, COPY.step2Text],
            [COPY.step3Title, COPY.step3Text],
          ].map(([title, text], i) => (
            <li
              key={title}
              className="flex items-baseline gap-4 border-b border-border py-4 first:border-t"
            >
              <span aria-hidden="true" className="font-display text-3xl font-bold text-primary/60">
                {i + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-label="Disclaimers"
        className="flex flex-col gap-2 rounded-lg border-l-4 border-warning bg-warning-wash p-4 text-sm leading-relaxed"
      >
        <p>{COPY.disclaimerMonitoringOnly}</p>
        <p>{COPY.disclaimerAiCanBeWrong}</p>
      </section>

      <nav aria-label="More pages" className="flex flex-col gap-2 sm:flex-row sm:gap-4">
        <Link
          href="/about"
          className="inline-flex min-h-[44px] items-center rounded px-2 underline decoration-primary decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {COPY.learnMore}
        </Link>
        <Link
          href="/insights"
          className="inline-flex min-h-[44px] items-center rounded px-2 underline decoration-primary decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {COPY.viewInsights}
        </Link>
      </nav>
    </div>
  );
}
