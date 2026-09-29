import { COPY } from "@/domain/copy";

export default function About() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">{COPY.aboutTitle}</h1>

      <section aria-labelledby="method" className="flex flex-col gap-2">
        <h2 id="method" className="text-xl font-semibold">
          {COPY.aboutMethodTitle}
        </h2>
        <p>{COPY.aboutMethodText}</p>
      </section>

      <section aria-labelledby="limits" className="flex flex-col gap-2">
        <h2 id="limits" className="text-xl font-semibold">
          {COPY.aboutLimitsTitle}
        </h2>
        <p>{COPY.aboutLimitsText}</p>
      </section>

      <section aria-labelledby="privacy" className="flex flex-col gap-2">
        <h2 id="privacy" className="text-xl font-semibold">
          {COPY.aboutPrivacyTitle}
        </h2>
        <p>{COPY.aboutPrivacyText}</p>
      </section>

      <section aria-labelledby="ai" className="flex flex-col gap-2">
        <h2 id="ai" className="text-xl font-semibold">
          {COPY.aboutAiTitle}
        </h2>
        <p>{COPY.aboutAiText}</p>
      </section>

      <section
        aria-label="Disclaimers"
        className="flex flex-col gap-2 rounded-lg bg-muted p-4 text-sm"
      >
        <p>{COPY.disclaimerMonitoringOnly}</p>
        <p>{COPY.disclaimerAiCanBeWrong}</p>
      </section>
    </div>
  );
}
