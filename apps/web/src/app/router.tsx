import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';
import { LoadingScreen } from '@/components/LoadingScreen';
import { OpportunitiesPage } from '@/features/opportunities/OpportunitiesPage';
import { Layout } from './Layout';
import { NotFound } from './NotFound';

/**
 * The list is the home page and stays in the main chunk; heavier pages (Leaflet, Recharts)
 * load on demand so the first paint is not blocked by libraries the user may never open.
 */
function lazyPage<T extends Record<string, ComponentType>>(
  loader: () => Promise<T>,
  name: keyof T,
) {
  const Page = lazy(async () => ({ default: (await loader())[name] as ComponentType }));
  return function LazyPage() {
    return (
      <Suspense fallback={<LoadingScreen label="Cargando vista…" />}>
        <Page />
      </Suspense>
    );
  };
}

const OpportunityDetailPage = lazyPage(
  () => import('@/features/detail/OpportunityDetailPage'),
  'OpportunityDetailPage',
);
const MapPage = lazyPage(() => import('@/features/map/MapPage'), 'MapPage');
const AnalyticsPage = lazyPage(() => import('@/features/analytics/AnalyticsPage'), 'AnalyticsPage');
const ShortlistPage = lazyPage(() => import('@/features/shortlist/ShortlistPage'), 'ShortlistPage');
const MarketPage = lazyPage(() => import('@/features/market/MarketPage'), 'MarketPage');
const SettingsPage = lazyPage(() => import('@/features/settings/SettingsPage'), 'SettingsPage');

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: OpportunitiesPage },
      { path: 'oportunidad/:id', Component: OpportunityDetailPage },
      { path: 'mapa', Component: MapPage },
      { path: 'analitica', Component: AnalyticsPage },
      { path: 'guardadas', Component: ShortlistPage },
      { path: 'mercado', Component: MarketPage },
      { path: 'ajustes', Component: SettingsPage },
      { path: '*', Component: NotFound },
    ],
  },
]);
