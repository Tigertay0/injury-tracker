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

const NIGHT_GROUND = '#080b14';

/** Paints the page edges (overscroll) and the phone browser bar in the night ground. */
function useNightChrome() {
  useEffect(() => {
    const html = document.documentElement;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = { background: html.style.background, theme: meta?.content };
    html.style.background = NIGHT_GROUND;
    meta?.setAttribute('content', NIGHT_GROUND);
    return () => {
      html.style.background = previous.background;
      if (meta && previous.theme) meta.setAttribute('content', previous.theme);
    };
  }, []);
}

export function MarketingLayout() {
  useHashScroll();
  useNightChrome();
  // The home hero runs full-bleed under the floating header; other pages start below it
  const isHome = useLocation().pathname === '/';
  return (
    <div className="site-night flex min-h-dvh flex-col bg-ground text-ink [color-scheme:dark]">
      <a href="#main" className="sr-only z-50 bg-surface px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <MarketingHeader />
      <main id="main" className={isHome ? 'flex-1' : 'flex-1 pt-24 sm:pt-28'}>
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}
