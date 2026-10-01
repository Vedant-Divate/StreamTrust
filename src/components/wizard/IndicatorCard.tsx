"use client";

import { Check } from "lucide-react";
import { COPY } from "@/domain/copy";
import { NOT_APPLICABLE, type IndicatorDef } from "@/domain/vocab";

export function IndicatorCard({
  def,
  value,
  onSelect,
  disabled,
}: {
  def: IndicatorDef;
  value: string | undefined;
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  const na = value === NOT_APPLICABLE;
  return (
    <fieldset
      disabled={disabled}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 disabled:opacity-60"
    >
      <legend className="px-1 font-display text-lg font-bold">{def.label}</legend>
      <details className="text-sm text-muted-foreground">
        <summary className="inline-flex min-h-[44px] cursor-pointer items-center rounded underline decoration-primary decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          ⓘ {def.scientificTerm}
        </summary>
        <p className="pt-1">Scientific term: {def.scientificTerm}.</p>
      </details>
      {na && <p className="text-sm text-muted-foreground">{COPY.notApplicableNote}</p>}
      <div className="flex flex-col gap-2" role="radiogroup" aria-label={def.label}>
        {def.values.map((v) => {
          const id = `${def.code}-${v.code}`;
          const selected = value === v.code;
          return (
            <div key={v.code}>
              <input
                id={id}
                type="radio"
                name={`indicator-${def.code}`}
                value={v.code}
                checked={selected}
                onChange={() => onSelect(v.code)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                title={v.helpText}
                className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-4 py-2 transition-colors peer-checked:border-primary peer-checked:bg-accent/40 peer-checked:[border-left-width:4px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
              >
                <span
                  aria-hidden="true"
                  className={
                    selected
                      ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      : "h-5 w-5 shrink-0 rounded-full border-2 border-input"
                  }
                >
                  {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="flex flex-col justify-center">
                  <span className="text-base font-medium">{v.label}</span>
                  <span className="text-sm text-muted-foreground">{v.helpText}</span>
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
