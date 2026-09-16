import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@secop-radar/ui';
import { RouterProvider } from 'react-router';
import { router } from './router';
import { useThemeEffect } from './useTheme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function ThemeBoundary({ children }: { children: React.ReactNode }) {
  useThemeEffect();
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <ThemeBoundary>
          <RouterProvider router={router} />
        </ThemeBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
