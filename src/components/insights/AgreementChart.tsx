"use client";

export interface BarItem {
  key: string;
  label: string;
  detail: string;
  rate: number | null;
}

/** Plain CSS bar chart (no chart dependency). */
export function AgreementChart({ items }: { items: BarItem[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="text-muted-foreground tabular-nums">{item.detail}</span>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${item.label}: ${item.rate === null ? "no data" : `${item.rate}% agreement`}`}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${item.rate ?? 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
