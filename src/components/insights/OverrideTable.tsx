"use client";

export interface OverrideRow {
  indicator: string;
  label: string;
  overrides: number;
  pairs: number;
}

/** Small table of overridden indicators. */
export function OverrideTable({ rows }: { rows: OverrideRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th scope="col" className="min-h-[44px] py-2 pr-3 font-medium">
              Question
            </th>
            <th scope="col" className="min-h-[44px] py-2 pr-3 text-right font-medium">
              Changed
            </th>
            <th scope="col" className="min-h-[44px] py-2 text-right font-medium">
              Compared
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.indicator} className="border-b last:border-0">
              <th scope="row" className="min-h-[44px] py-2 pr-3 text-left font-normal">
                {row.label}
              </th>
              <td className="py-2 pr-3 text-right font-medium">{row.overrides}</td>
              <td className="py-2 text-right text-muted-foreground">{row.pairs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
