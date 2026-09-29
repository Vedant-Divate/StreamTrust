"use client";

import { COPY } from "@/domain/copy";

export function ProgressSteps({ step, of }: { step: number; of: number }) {
  return (
    <p aria-label={`Step ${step} of ${of}`} className="text-sm text-muted-foreground">
      Step {step} of {of}
    </p>
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
