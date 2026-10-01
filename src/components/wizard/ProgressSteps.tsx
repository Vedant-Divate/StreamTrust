"use client";

import { COPY } from "@/domain/copy";

export function ProgressSteps({ step, of }: { step: number; of: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p aria-label={`Step ${step} of ${of}`} className="text-sm text-muted-foreground">
        Step {step} of {of}
      </p>
      {/* Ford markers: the landing divider's ripple, scaled down to a small
          repeated glyph — filled up to the current step. Decorative; the
          label above carries the meaning. */}
      <div aria-hidden="true" className="flex gap-1.5">
        {Array.from({ length: of }, (_, i) => (
          <svg key={i} viewBox="0 0 32 8" preserveAspectRatio="none" className="h-2 flex-1">
            <path
              d="M1 5q4-4 8 0t8 0t8 0"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={i < step ? "stroke-primary" : "stroke-border"}
            />
          </svg>
        ))}
      </div>
    </div>
  );
}

export function WizardNav({
  backHref,
  backLabel,
  nextHref,
  nextLabel,
}: {
  backHref?: string;
  backLabel?: string;
  nextHref?: string;
  nextLabel?: string;
}) {
  return (
    <nav aria-label="Wizard" className="flex items-center justify-between gap-3 pt-2">
      <span>
        {backHref && (
          <a
            href={backHref}
            className="inline-flex min-h-[44px] items-center rounded-lg border px-5 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {backLabel ?? COPY.backButton}
          </a>
        )}
      </span>
      <span>
        {nextHref && nextLabel && (
          <a
            href={nextHref}
            className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {nextLabel}
          </a>
        )}
      </span>
    </nav>
  );
}
