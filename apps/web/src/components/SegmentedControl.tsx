import { cn } from '@secop-radar/ui';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'sm',
}: {
  value: T;
  options: Array<SegmentOption<T>>;
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex w-full rounded-md border border-border bg-muted p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 cursor-pointer rounded-sm px-2 font-medium whitespace-nowrap text-muted-fg transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            size === 'sm' ? 'h-6 text-xs' : 'h-7 text-[13px]',
            value === o.value && 'bg-card text-fg shadow-[0_1px_0_var(--color-border)]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
