import { Button, EmptyState } from '@secop-radar/ui';
import { AlertTriangle } from 'lucide-react';
import { t } from '@/i18n/es';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="p-6">
      <EmptyState
        icon={<AlertTriangle className="text-danger" />}
        title={t.common.error}
        description={
          <div className="space-y-2">
            <p className="break-words">{message}</p>
            <p>
              Si el archivo de datos está dañado o desactualizado, vuelve a ejecutar{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">pnpm scraper</code>.
            </p>
          </div>
        }
        action={
          onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              {t.common.retry}
            </Button>
          ) : null
        }
      />
    </div>
  );
}
