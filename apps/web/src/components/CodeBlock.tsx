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
    <div className={cn('group relative rounded-lg border border-border bg-muted/60', className)}>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-fg">
        <code>{code}</code>
      </pre>
      <Button
        size="icon-sm"
        variant="ghost"
        className="absolute top-1.5 right-1.5 opacity-60 group-hover:opacity-100"
        onClick={() => void copy()}
        aria-label={copied ? t.common.copied : t.common.copy}
      >
        {copied ? <Check className="text-success" /> : <Copy />}
      </Button>
    </div>
  );
}
