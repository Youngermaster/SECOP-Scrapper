import { cn } from '@secop-radar/ui';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useSettings, type Theme } from '@/stores/settings';

const OPTIONS: Array<{ value: Theme; icon: typeof Sun; label: string }> = [
  { value: 'light', icon: Sun, label: 'Tema claro' },
  { value: 'system', icon: Monitor, label: 'Tema del sistema' },
  { value: 'dark', icon: Moon, label: 'Tema oscuro' },
];

export function ThemeToggle() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="inline-flex rounded-md border border-border bg-card p-0.5"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => setTheme(o.value)}
          className={cn(
            'grid h-6 w-7 cursor-pointer place-items-center rounded-sm text-muted-fg transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            theme === o.value && 'bg-muted text-fg',
          )}
        >
          <o.icon className="size-3.5" strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}
