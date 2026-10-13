// App shell: left sidebar on desktop (Jakob: apps keep navigation on the left), a
// bottom tab bar on phones with "Log" in the middle where the thumb rests (Fitts).
import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { UserButton } from '@clerk/react';
import { Bed, DotsThreeOutline, FirstAidKit, Flask, GearSix, House, Plus, SneakerMove, type Icon } from '@phosphor-icons/react';
import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { authConfigured, useAppAuth } from '@/lib/auth';
import { AppBaseContext, PlayerDataProvider, useAppBase, usePlayerData } from '@/lib/player-data';
import { cn } from '@/lib/utils';
import { Onboarding } from './onboarding';
import { AppSkeleton } from './skeleton';

interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  end?: boolean;
}

const nav = (base: string): NavItem[] => [
  { to: base, label: 'Dashboard', icon: House, end: true },
  { to: `${base}/log`, label: 'Log session', icon: Plus },
  { to: `${base}/recovery`, label: 'Recovery', icon: Bed },
  { to: `${base}/equipment`, label: 'Equipment', icon: SneakerMove },
  { to: `${base}/injuries`, label: 'Injuries', icon: FirstAidKit },
  { to: `${base}/settings`, label: 'Settings', icon: GearSix },
];

function Sidebar() {
  const base = useAppBase();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
      <Link to="/" className="mb-8 px-3" aria-label="PitchSafe home">
        <Wordmark />
      </Link>
      <nav aria-label="App" className="flex flex-col gap-1">
        {nav(base).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-small font-semibold',
                isActive ? 'bg-accent-soft text-accent-ink' : 'text-ink-2 hover:bg-sunken hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon aria-hidden weight={isActive ? 'fill' : 'regular'} className="size-5" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3 border-t border-line px-3 pt-4">
        <Link to="/science" className="inline-flex items-center gap-2 text-small text-ink-2 hover:text-ink">
          <Flask aria-hidden className="size-4" />
          How scores work
        </Link>
        {authConfigured && base === '/app' && <UserButton showName appearance={{ elements: { userButtonBox: 'flex-row-reverse', userButtonOuterIdentifier: 'text-small font-semibold text-ink' } }} />}
      </div>
    </aside>
  );
}

const tabs = (base: string): NavItem[] => [
  { to: base, label: 'Home', icon: House, end: true },
  { to: `${base}/recovery`, label: 'Recovery', icon: Bed },
  { to: `${base}/log`, label: 'Log', icon: Plus },
  { to: `${base}/injuries`, label: 'Injuries', icon: FirstAidKit },
];

function BottomBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const base = useAppBase();
  const { pathname } = useLocation();
  const moreActive = pathname.startsWith(`${base}/equipment`) || pathname.startsWith(`${base}/settings`);

  return (
    <>
      <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5">
          {tabs(base).map(({ to, label, icon: Icon, end }) =>
            to === `${base}/log` ? (
              <NavLink key={to} to={to} className="grid place-items-center" aria-label="Log a session">
                {({ isActive }) => (
                  <span className={cn('press grid size-12 place-items-center rounded-full bg-accent text-on-accent shadow-lift', isActive && 'ring-4 ring-accent-soft')}>
                    <Icon aria-hidden weight="bold" className="size-6" />
                  </span>
                )}
              </NavLink>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn('flex flex-col items-center justify-center gap-0.5 text-caption font-semibold', isActive ? 'text-accent-ink' : 'text-ink-2')}
              >
                {({ isActive }) => (
                  <>
                    <Icon aria-hidden weight={isActive ? 'fill' : 'regular'} className="size-6" />
                    {label}
                  </>
                )}
              </NavLink>
            ),
          )}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn('flex flex-col items-center justify-center gap-0.5 text-caption font-semibold', moreActive ? 'text-accent-ink' : 'text-ink-2')}
          >
            <DotsThreeOutline aria-hidden weight={moreActive ? 'fill' : 'regular'} className="size-6" />
            More
          </button>
        </div>
      </nav>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="app-scope px-4 pt-5 pb-6">
          <SheetTitle className="px-2">More</SheetTitle>
          <div className="mt-3 flex flex-col">
            {[
              { to: `${base}/equipment`, label: 'Equipment', icon: SneakerMove },
              { to: `${base}/settings`, label: 'Settings', icon: GearSix },
              { to: '/science', label: 'How scores work', icon: Flask },
            ].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setMoreOpen(false)} className="flex h-13 items-center gap-3 rounded-[var(--radius-control)] px-3 text-body font-semibold text-ink hover:bg-sunken">
                <Icon aria-hidden className="size-6 text-ink-2" />
                {label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function MobileTopBar() {
  const base = useAppBase();
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-ground/95 px-4 backdrop-blur-md lg:hidden">
      <Link to="/" aria-label="PitchSafe home">
        <Wordmark className="text-[1.25rem]" />
      </Link>
      {authConfigured && base === '/app' && <UserButton />}
    </header>
  );
}

export function Shell({ banner }: { banner?: React.ReactNode }) {
  const { state, actions } = usePlayerData();

  if (state.status === 'loading') return <AppSkeleton />;
  if (state.status === 'error') {
    return (
      <div className="grid min-h-dvh place-items-center px-5">
        <div className="max-w-sm text-center">
          <p className="font-display text-h2 font-extrabold text-ink">Could not load your data</p>
          <p className="mt-2 text-body text-ink-2">{state.message}</p>
          <Button className="mt-6" onClick={() => void actions.reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (!state.data.profile) return <Onboarding />;

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {banner}
        <MobileTopBar />
        <main id="main" className="mx-auto w-full max-w-[1080px] flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
          <Outlet />
        </main>
      </div>
      <BottomBar />
    </div>
  );
}

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAppAuth();
  const { pathname } = useLocation();

  if (!authConfigured) return <Navigate to="/sign-in" replace />;
  if (!isLoaded) return <div className="app-scope min-h-dvh bg-ground"><AppSkeleton /></div>;
  if (!isSignedIn) return <Navigate to={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`} replace />;

  return (
    <div className="app-scope min-h-dvh bg-ground text-ink">
      <AppBaseContext.Provider value="/app">
        <PlayerDataProvider>
          <Shell />
        </PlayerDataProvider>
      </AppBaseContext.Provider>
    </div>
  );
}
