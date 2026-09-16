import type { Opportunity } from '@secop-radar/core';
import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from '@secop-radar/ui';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useShortlist } from '@/stores/shortlist';

export function SaveButton({
  opportunity,
  size = 'icon-sm',
  showLabel = false,
}: {
  opportunity: Opportunity;
  size?: 'icon-sm' | 'icon' | 'md';
  showLabel?: boolean;
}) {
  const saved = useShortlist((s) => s.entries[opportunity.id] != null);
  const add = useShortlist((s) => s.add);
  const remove = useShortlist((s) => s.remove);
  const toggle = () => {
    if (saved) remove(opportunity.id);
    else
      add({
        id: opportunity.id,
        snapshot: {
          title: opportunity.title,
          entity: opportunity.entity.name,
          closesAt: opportunity.closesAt,
          value: opportunity.value,
          url: opportunity.url,
        },
      });
  };
  const label = saved ? 'Quitar de guardadas' : 'Guardar oportunidad';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={saved ? 'secondary' : 'ghost'}
          size={size}
          aria-pressed={saved}
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            toggle();
          }}
          className={cn(saved && 'text-primary')}
        >
          {saved ? <BookmarkCheck /> : <Bookmark />}
          {showLabel ? (saved ? 'Guardada' : 'Guardar') : null}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
