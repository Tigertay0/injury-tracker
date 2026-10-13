import { createBrowserRouter, Outlet, ScrollRestoration } from 'react-router';
import { Toaster } from 'sonner';
import { MarketingLayout } from '@/pages/marketing-layout';
import Landing from '@/pages/landing/landing';
import { RouteError } from '@/pages/route-error';

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast: '!rounded-[var(--radius-control)] !border !border-line !bg-surface !text-ink !shadow-overlay !font-sans',
            description: '!text-ink-2',
          },
        }}
      />
    </>
  );
}

const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await load()).default });

const appPages = [
  { index: true, lazy: page(() => import('@/app/dashboard')) },
  { path: 'log', lazy: page(() => import('@/app/log')) },
  { path: 'recovery', lazy: page(() => import('@/app/recovery')) },
  { path: 'equipment', lazy: page(() => import('@/app/equipment')) },
  { path: 'injuries', lazy: page(() => import('@/app/injuries')) },
  { path: 'settings', lazy: page(() => import('@/app/settings')) },
];

export const router = createBrowserRouter([
  {
    Component: Root,
    ErrorBoundary: RouteError,
    // Shown while a lazily loaded route's code downloads on first visit
    HydrateFallback: () => <div className="min-h-dvh bg-ground" aria-busy="true" />,
    children: [
      // Public pages: no Clerk SDK is loaded here
      {
        Component: MarketingLayout,
        children: [
          { index: true, Component: Landing },
          { path: 'science', lazy: page(() => import('@/pages/science')) },
          { path: 'privacy', lazy: page(() => import('@/pages/privacy')) },
          { path: 'terms', lazy: page(() => import('@/pages/terms')) },
          { path: '*', lazy: page(() => import('@/pages/not-found')) },
        ],
      },
      {
        path: 'demo',
        lazy: page(() => import('@/app/demo-layout')),
        children: appPages,
      },
      // Everything that needs sign-in state sits under ClerkRoot
      {
        lazy: page(() => import('@/lib/clerk-root')),
        children: [
          {
            Component: MarketingLayout,
            children: [
              { path: 'use', lazy: page(() => import('@/pages/use-app')) },
              { path: 'sign-in/*', lazy: page(() => import('@/pages/sign-in')) },
              { path: 'sign-up/*', lazy: page(() => import('@/pages/sign-up')) },
            ],
          },
          {
            path: 'app',
            lazy: page(() => import('@/app/app-layout')),
            children: appPages,
          },
        ],
      },
    ],
  },
]);
