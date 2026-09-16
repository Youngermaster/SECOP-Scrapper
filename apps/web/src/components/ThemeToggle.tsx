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
    <div role="radiogroup" aria-label="Tema" className="inline-flex rounded-md bg-white/5 p-0.5">
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
            'grid size-7 place-items-center rounded text-sidebar-muted transition-colors hover:text-sidebar-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            theme === o.value && 'bg-sidebar-active text-sidebar-fg',
          )}
        >
          <o.icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
