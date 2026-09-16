import { createBrowserRouter } from 'react-router';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { OpportunityDetailPage } from '@/features/detail/OpportunityDetailPage';
import { MapPage } from '@/features/map/MapPage';
import { MarketPage } from '@/features/market/MarketPage';
import { OpportunitiesPage } from '@/features/opportunities/OpportunitiesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ShortlistPage } from '@/features/shortlist/ShortlistPage';
import { Layout } from './Layout';
import { NotFound } from './NotFound';

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
