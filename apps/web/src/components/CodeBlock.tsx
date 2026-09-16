import { Button, cn } from '@secop-radar/ui';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/i18n/es';

export function CodeBlock({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div
      className={cn(
        'group relative rounded-md border border-border bg-muted/50 dark:bg-bg',
        className,
      )}
    >
      <pre className="overflow-x-auto py-2.5 pr-10 pl-3.5 font-mono text-xs leading-relaxed text-fg">
        <code>
          <span aria-hidden="true" className="text-muted-fg select-none">
            ${' '}
          </span>
          {code}
        </code>
      </pre>
      <Button
        size="icon-sm"
        variant="ghost"
        className="absolute top-1 right-1 opacity-70 group-hover:opacity-100"
        onClick={() => void copy()}
        aria-label={copied ? t.common.copied : t.common.copy}
      >
        {copied ? <Check className="text-success" /> : <Copy />}
      </Button>
    </div>
  );
}
