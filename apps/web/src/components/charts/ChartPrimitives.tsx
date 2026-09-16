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
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-fg shadow-md">
      {label ? <div className="mb-1 font-medium">{label}</div> : null}
      {rows.map((r) => (
        <div key={r.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-fg">
            {r.color ? (
              <span className="inline-block size-2 rounded-full" style={{ background: r.color }} />
            ) : null}
            {r.name}
          </span>
          <span className="tabular font-medium">{r.value}</span>
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

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] font-medium tracking-wide text-muted-fg uppercase">{label}</div>
      <div className="tabular mt-1 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted-fg">{hint}</div> : null}
    </div>
  );
}
