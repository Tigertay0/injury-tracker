import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';

/** Scrolls to #hash targets after client-side navigation (e.g. /#how from another page). */
function useHashScroll() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [hash, pathname]);
}

export function MarketingLayout() {
  useHashScroll();
  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <a href="#main" className="sr-only z-50 rounded-[var(--radius-control)] bg-surface px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <MarketingHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}
