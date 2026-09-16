import { cn } from '@secop-radar/ui';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BarChart3, Bookmark, Building2, Map as MapIcon, Radar, Settings2 } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { t } from '@/i18n/es';
import { useShortlist } from '@/stores/shortlist';
import { DatasetProvider } from '@/data/DatasetProvider';
import { DataFreshness } from '@/components/DataFreshness';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV = [
  { to: '/', label: t.nav.opportunities, icon: Radar, end: true },
  { to: '/mapa', label: t.nav.map, icon: MapIcon },
  { to: '/analitica', label: t.nav.analytics, icon: BarChart3 },
  { to: '/guardadas', label: t.nav.shortlist, icon: Bookmark },
  { to: '/mercado', label: t.nav.market, icon: Building2 },
  { to: '/ajustes', label: t.nav.settings, icon: Settings2 },
] as const;

export function Layout() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const saved = useShortlist((s) => Object.keys(s.entries).length);
  const routeKey = location.pathname.split('/')[1] ?? '';

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        Saltar al contenido
      </a>

      <aside className="flex w-full shrink-0 flex-col border-b border-border bg-sidebar text-sidebar-fg md:sticky md:top-0 md:h-dvh md:w-[232px] md:border-r md:border-b-0">
        <div className="flex h-14 items-center gap-2.5 px-4">
          <span className="grid size-7 place-items-center rounded-md border border-border-strong bg-card text-fg">
            <Radar className="size-4" strokeWidth={2} />
          </span>
          <div className="leading-none">
            <div className="text-[13px] font-semibold tracking-tight">{t.app.name}</div>
            <div className="mt-1 font-mono text-[10px] text-sidebar-muted uppercase">
              SECOP II / datos.gov.co
            </div>
          </div>
        </div>

        <nav
          aria-label="Principal"
          className="flex gap-0.5 overflow-x-auto px-2 pb-2 md:flex-col md:pt-1 md:pb-0"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item && item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex h-8 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-sidebar-muted transition-colors hover:bg-sidebar-active/60 hover:text-sidebar-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  isActive && 'bg-sidebar-active text-sidebar-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 bottom-1.5 -left-2 hidden w-0.5 rounded-full bg-primary md:block"
                    />
                  ) : null}
                  <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
                  <span>{item.label}</span>
                  {item.to === '/guardadas' && saved > 0 ? (
                    <span className="ml-auto rounded-sm bg-primary-soft px-1.5 font-mono text-[10px] font-semibold text-primary">
                      {saved}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden flex-col gap-3 border-t border-border px-4 py-3 md:flex">
          <DataFreshness />
          <ThemeToggle />
        </div>
      </aside>

      <main id="main" className="min-w-0 flex-1">
        <DatasetProvider>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={routeKey}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </DatasetProvider>
      </main>
    </div>
  );
}
