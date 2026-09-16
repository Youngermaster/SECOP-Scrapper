import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@secop-radar/ui';

/** Tooltip body rendered inside Recharts' tooltip; uses text tokens, never series colors for text. */
export function ChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: ReactNode;
  rows: Array<{ name: string; value: string; color?: string }>;
}) {
  if (!active) return null;
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-fg shadow-pop">
      {label ? <div className="mb-1 font-medium">{label}</div> : null}
      {rows.map((r) => (
        <div key={r.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-fg">
            {r.color ? (
              <span className="inline-block size-2 rounded-full" style={{ background: r.color }} />
            ) : null}
            {r.name}
          </span>
          <span className="font-mono font-medium tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** KPI tile: label above, big mono numeral, optional hint. Meant to sit in a hairline grid. */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-2xs font-medium text-muted-fg">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-2xs text-muted-fg">{hint}</div> : null}
    </div>
  );
}

/** Wrap StatTiles so they read as one instrument strip. */
export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border bg-card md:grid-cols-3 md:divide-y-0 lg:grid-cols-6">
      {children}
    </div>
  );
}
