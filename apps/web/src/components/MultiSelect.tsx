import {
  Badge,
  Button,
  Checkbox,
  cn,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@secop-radar/ui';
import { ChevronsUpDown, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { normalizeText } from '@secop-radar/core';

export interface MultiSelectOption {
  value: string;
  label: string;
  count?: number;
}

/** Popover check-list with search and counts; the trigger summarises the selection. */
export function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  onClear,
  placeholder = 'Todos',
  searchable = true,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  searchable?: boolean;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const n = normalizeText(q);
    return n ? options.filter((o) => normalizeText(o.label).includes(n)) : options;
  }, [options, q]);
  const selectedLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);
  const summary =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? selectedLabels.join(', ')
        : `${selected.length} seleccionados`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${summary}`}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            selected.length === 0 ? 'text-muted-fg' : 'text-fg',
          )}
        >
          <span className="truncate">{summary}</span>
          <span className="flex items-center gap-1">
            {selected.length > 0 ? <Badge tone="primary">{selected.length}</Badge> : null}
            <ChevronsUpDown className="size-4 opacity-60" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        {searchable ? (
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Buscar ${label.toLowerCase()}…`}
            className="mb-2 h-8"
            aria-label={`Buscar ${label}`}
          />
        ) : null}
        <ul
          className="max-h-64 scrollbar-thin space-y-0.5 overflow-y-auto"
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
        >
          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-center text-xs text-muted-fg">Sin coincidencias</li>
          ) : null}
          {filtered.map((o) => {
            const checked = selected.includes(o.value);
            const id = `ms-${label}-${o.value}`.replace(/\s+/g, '-');
            return (
              <li key={o.value} role="option" aria-selected={checked}>
                <label
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox id={id} checked={checked} onCheckedChange={() => onToggle(o.value)} />
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.count != null ? (
                    <span className="tabular text-xs text-muted-fg">
                      {o.count.toLocaleString('es-CO')}
                    </span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
        {selected.length > 0 ? (
          <div className="mt-2 border-t border-border pt-2">
            <Button variant="ghost" size="sm" onClick={onClear} className="w-full justify-start">
              <X /> Limpiar selección
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
