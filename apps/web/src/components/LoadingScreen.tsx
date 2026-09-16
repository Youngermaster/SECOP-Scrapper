import { Skeleton } from '@secop-radar/ui';

export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="p-6" role="status" aria-live="polite">
      <p className="mb-4 text-sm text-muted-fg">{label}</p>
      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-9 w-2/3" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
