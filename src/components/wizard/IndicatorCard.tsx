"use client";

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
      className="flex flex-col gap-2 rounded-lg border p-4 disabled:opacity-60"
    >
      <legend className="px-1 text-base font-medium">{def.label}</legend>
      <details className="text-sm text-muted-foreground">
        <summary className="inline-flex min-h-[44px] cursor-pointer items-center rounded underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          ⓘ {def.scientificTerm}
        </summary>
        <p className="pt-1">Scientific term: {def.scientificTerm}.</p>
      </details>
      {na && <p className="text-sm text-muted-foreground">{COPY.notApplicableNote}</p>}
      <div className="flex flex-col gap-2" role="radiogroup" aria-label={def.label}>
        {def.values.map((v) => {
          const id = `${def.code}-${v.code}`;
          return (
            <div key={v.code}>
              <input
                id={id}
                type="radio"
                name={`indicator-${def.code}`}
                value={v.code}
                checked={value === v.code}
                onChange={() => onSelect(v.code)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                title={v.helpText}
                className="flex min-h-[44px] cursor-pointer flex-col justify-center rounded-lg border px-4 py-2 transition-colors peer-checked:border-primary peer-checked:bg-muted peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
              >
                <span className="text-base">{v.label}</span>
                <span className="text-sm text-muted-foreground">{v.helpText}</span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
