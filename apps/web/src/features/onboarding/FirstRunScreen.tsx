import { Button } from '@secop-radar/ui';
import { motion, useReducedMotion } from 'motion/react';
import { KeyRound, Radar, RefreshCw } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { t } from '@/i18n/es';

/**
 * First run: no local dataset yet. Split layout: what the tool is on the left,
 * the three commands on the right. Everything runs locally, so the copy says so.
 */
export function FirstRunScreen({ onRetry }: { onRetry: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col justify-between border-b border-border bg-sidebar px-6 py-8 lg:border-r lg:border-b-0 lg:px-12 lg:py-14"
      >
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md border border-border-strong bg-card">
            <Radar className="size-4" strokeWidth={2} />
          </span>
          <span className="text-[13px] font-semibold tracking-tight">{t.app.name}</span>
        </div>
        <div className="my-10 max-w-md lg:my-0">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance lg:text-[32px]">
            {t.firstRun.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-2">{t.firstRun.body}</p>
          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-5 font-mono text-2xs text-muted-fg">
            <div>
              <dt>Fuente</dt>
              <dd className="mt-1 text-fg">datos.gov.co</dd>
            </div>
            <div>
              <dt>Almacenamiento</dt>
              <dd className="mt-1 text-fg">SQLite local</dd>
            </div>
            <div>
              <dt>Cuenta</dt>
              <dd className="mt-1 text-fg">No requiere</dd>
            </div>
          </dl>
        </div>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-fg">
          <KeyRound className="mt-0.5 size-3.5 shrink-0" />
          <span>{t.firstRun.tip}</span>
        </p>
      </motion.section>

      <section className="flex flex-col justify-center px-6 py-8 lg:px-12">
        <ol className="max-w-xl space-y-6">
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
        </ol>
        <div className="mt-8 max-w-xl border-t border-border pt-5">
          <Button onClick={onRetry} size="lg">
            <RefreshCw />
            {t.firstRun.reload}
          </Button>
        </div>
      </section>
    </div>
  );
}

function Step({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1.5rem_1fr] gap-x-3 gap-y-2">
      <span className="font-mono text-xs leading-6 text-muted-fg tabular-nums">0{n}</span>
      <p className="self-center text-[13px] font-medium">{label}</p>
      <div className="col-start-2">{children}</div>
    </li>
  );
}
