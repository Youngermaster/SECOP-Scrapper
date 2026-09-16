import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Composed empty state: left-aligned, hairline frame, no dashed placeholder box. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-lg flex-col items-start gap-3 rounded-lg border border-border bg-card px-6 py-8',
        className,
      )}
    >
      {icon ? (
        <div className="grid size-9 place-items-center rounded-md bg-muted text-fg-2 [&_svg]:size-4.5">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? (
          <div className="text-[13px] leading-relaxed text-muted-fg">{description}</div>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 items-center rounded-sm border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-fg',
        className,
      )}
      {...props}
    />
  );
}
