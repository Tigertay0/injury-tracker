import { createBrowserRouter, Outlet, ScrollRestoration } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import { MarketingLayout } from '@/pages/marketing-layout';
import Landing from '@/pages/landing/landing';

function Root() {
  return (
    <AuthProvider>
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
    </AuthProvider>
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
    children: [
      {
        Component: MarketingLayout,
        children: [
          { index: true, Component: Landing },
          { path: 'use', lazy: page(() => import('@/pages/use-app')) },
          { path: 'science', lazy: page(() => import('@/pages/science')) },
          { path: 'privacy', lazy: page(() => import('@/pages/privacy')) },
          { path: 'terms', lazy: page(() => import('@/pages/terms')) },
          { path: 'sign-in/*', lazy: page(() => import('@/pages/sign-in')) },
          { path: 'sign-up/*', lazy: page(() => import('@/pages/sign-up')) },
          { path: '*', lazy: page(() => import('@/pages/not-found')) },
        ],
      },
      {
        path: 'app',
        lazy: page(() => import('@/app/app-layout')),
        children: appPages,
      },
      {
        path: 'demo',
        lazy: page(() => import('@/app/demo-layout')),
        children: appPages,
      },
    ],
  },
]);
