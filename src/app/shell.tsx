// App shell: left sidebar on desktop (Jakob: apps keep navigation on the left), a
// bottom tab bar on phones with "Log" in the middle where the thumb rests (Fitts).
// No Clerk imports here, so the public demo can use it without the Clerk SDK.
import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Bed, DotsThreeOutline, FirstAidKit, Flask, GearSix, House, ListPlus, Plus, SneakerMove, type Icon } from '@phosphor-icons/react';
import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useAccount, useAppBase, usePlayerData } from '@/lib/player-data';
import { cn } from '@/lib/utils';
import { Onboarding } from './onboarding';
import { AppSkeleton } from './skeleton';

interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  end?: boolean;
}

// My drills is part of PitchSafe Plus, so it only appears once Plus is on sale
const nav = (base: string, plusAvailable: boolean): NavItem[] => [
  { to: base, label: 'Dashboard', icon: House, end: true },
  { to: `${base}/log`, label: 'Log session', icon: Plus },
  ...(plusAvailable ? [{ to: `${base}/drills`, label: 'My drills', icon: ListPlus }] : []),
  { to: `${base}/recovery`, label: 'Recovery', icon: Bed },
  { to: `${base}/equipment`, label: 'Equipment', icon: SneakerMove },
  { to: `${base}/injuries`, label: 'Injuries', icon: FirstAidKit },
  { to: `${base}/settings`, label: 'Settings', icon: GearSix },
];

function Sidebar({ user }: { user?: ReactNode }) {
  const base = useAppBase();
  const { plusAvailable } = useAccount();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
      <Link to="/" className="mb-8 px-3" aria-label="PitchSafe home">
        <Wordmark />
      </Link>
      <nav aria-label="App" className="flex flex-col gap-1">
        {nav(base, plusAvailable).map(({ to, label, icon: Icon, end }) => (
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
        {user}
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
  const { plusAvailable } = useAccount();
  const moreActive = pathname.startsWith(`${base}/equipment`) || pathname.startsWith(`${base}/settings`) || (plusAvailable && pathname.startsWith(`${base}/drills`));

  return (
    <>
      <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5">
          {tabs(base).map(({ to, label, icon: Icon, end }) =>
            to === `${base}/log` ? (
              <NavLink key={to} to={to} className="grid place-items-center rounded-[var(--radius-control)]" aria-label="Log a session">
                {({ isActive }) => (
                  <span className={cn('press grid size-12 place-items-center rounded-[var(--radius-control)] bg-accent text-on-accent shadow-lift', isActive && 'ring-4 ring-accent-soft')}>
                    <Icon aria-hidden weight="bold" className="size-6" />
                  </span>
                )}
              </NavLink>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn('flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] text-caption font-semibold', isActive ? 'text-accent-ink' : 'text-ink-2')}
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
            className={cn('flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] text-caption font-semibold', moreActive ? 'text-accent-ink' : 'text-ink-2')}
          >
            <DotsThreeOutline aria-hidden weight={moreActive ? 'fill' : 'regular'} className="size-6" />
            More
          </button>
        </div>
      </nav>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="app-scope px-4 pt-5 pb-6">
          <SheetTitle className="px-2">More</SheetTitle>
          <SheetDescription className="sr-only">More app pages</SheetDescription>
          <div className="mt-3 flex flex-col">
            {[
              { to: `${base}/equipment`, label: 'Equipment', icon: SneakerMove },
              ...(plusAvailable ? [{ to: `${base}/drills`, label: 'My drills', icon: ListPlus }] : []),
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

function MobileTopBar({ user }: { user?: ReactNode }) {
  return (
    // Always night-coloured: the installed app draws under the status bar, whose text is white
    <header className="theme-night sticky top-0 z-10 flex min-h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-line bg-ground px-4 pt-[env(safe-area-inset-top)] text-ink lg:hidden">
      <Link to="/" aria-label="PitchSafe home">
        <Wordmark className="text-[1.25rem]" />
      </Link>
      {user}
    </header>
  );
}

export function Shell({ banner, user, compactUser }: { banner?: ReactNode; user?: ReactNode; compactUser?: ReactNode }) {
  const { state, actions } = usePlayerData();

  if (state.status === 'loading') return <AppSkeleton />;
  if (state.status === 'error') {
    return (
      <div className="grid min-h-dvh place-items-center px-5">
        <div className="max-w-sm text-center">
          <p className="font-display text-h2 font-bold text-ink">Could not load your data</p>
          <p className="mt-2 text-body text-ink-2">{state.message}</p>
          {state.code === 401 ? (
            <Button asChild className="mt-6">
              <Link to="/sign-in">Sign in again</Link>
            </Button>
          ) : (
            <Button className="mt-6" onClick={() => void actions.reload()}>
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }
  if (!state.data.profile) return <Onboarding />;

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar user={compactUser} />
        {banner}
        <main id="main" className="mx-auto w-full max-w-[1080px] flex-1 px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
          <Outlet />
        </main>
      </div>
      <BottomBar />
    </div>
  );
}
