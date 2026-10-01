import { COPY } from "@/domain/copy";

export default function About() {
  const sections = [
    ["method", COPY.aboutMethodTitle, COPY.aboutMethodText],
    ["limits", COPY.aboutLimitsTitle, COPY.aboutLimitsText],
    ["privacy", COPY.aboutPrivacyTitle, COPY.aboutPrivacyText],
    ["ai", COPY.aboutAiTitle, COPY.aboutAiText],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">{COPY.aboutTitle}</h1>

      {sections.map(([id, title, text]) => (
        <section
          key={id}
          aria-labelledby={id}
          className="flex flex-col gap-2 border-t border-border pt-4"
        >
          <h2 id={id} className="font-display text-xl font-bold">
            {title}
          </h2>
          <p className="leading-relaxed">{text}</p>
        </section>
      ))}

      <section
        aria-label="Disclaimers"
        className="flex flex-col gap-2 rounded-lg border-l-4 border-warning bg-warning-wash p-4 text-sm leading-relaxed"
      >
        <p>{COPY.disclaimerMonitoringOnly}</p>
        <p>{COPY.disclaimerAiCanBeWrong}</p>
      </section>
    </div>
  );
}
