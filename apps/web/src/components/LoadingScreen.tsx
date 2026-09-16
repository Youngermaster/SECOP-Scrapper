import { Skeleton } from '@secop-radar/ui';

/** Skeleton that mirrors the opportunities page: toolbar, filter rail, dense rows. */
export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex h-dvh flex-col" role="status" aria-live="polite">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="size-8" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[272px] shrink-0 space-y-4 border-r border-border p-4 md:block">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="flex-1 px-5 py-3">
          <p className="mb-3 text-xs text-muted-fg">{label}</p>
          <div className="divide-y divide-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="size-9" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
