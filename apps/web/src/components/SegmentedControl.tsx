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
      className="inline-flex w-full rounded-md bg-muted p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded px-2 font-medium whitespace-nowrap text-muted-fg transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            size === 'sm' ? 'py-1 text-xs' : 'py-1.5 text-sm',
            value === o.value && 'bg-card text-fg shadow-sm',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
