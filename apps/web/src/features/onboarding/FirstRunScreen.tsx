import { Button, Card, CardContent } from '@secop-radar/ui';
import { motion } from 'motion/react';
import { KeyRound, Radar, RefreshCw } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { t } from '@/i18n/es';

export function FirstRunScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="mb-3 inline-grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Radar className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.firstRun.title}</h1>
        <p className="mt-2 text-muted-fg">{t.firstRun.body}</p>
      </motion.div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <Step n={1} label={t.firstRun.step1}>
            <CodeBlock code="pnpm install" />
          </Step>
          <Step n={2} label={t.firstRun.step2}>
            <CodeBlock code="pnpm scraper" />
          </Step>
          <Step n={3} label={t.firstRun.step3}>
            <CodeBlock
              code={'pnpm scraper -d Antioquia -k software -k "aplicación" --since 2026-09-01'}
            />
          </Step>
          <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-fg">
            <KeyRound className="mt-0.5 size-4 shrink-0" />
            <p>{t.firstRun.tip}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button onClick={onRetry}>
          <RefreshCw />
          {t.firstRun.reload}
        </Button>
      </div>
    </div>
  );
}

function Step({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1.75rem_1fr] gap-x-3 gap-y-2">
      <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-fg">
        {n}
      </span>
      <p className="self-center text-sm font-medium">{label}</p>
      <div className="col-start-2">{children}</div>
    </div>
  );
}
