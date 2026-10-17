// Floating header for the marketing pages, after the Floodlit home direction. Glass bar
// over the hero, rounded corners, auth-aware actions, and a sheet menu on phones
// (structure from 21st.dev ln-dev7/header-17).
import { useState } from 'react';
import { Link } from 'react-router';
import { List } from '@phosphor-icons/react';
import { Button, GHOST_WASH } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Wordmark } from '@/components/wordmark';
import { useAppAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'How it works', to: '/#how' },
  { label: 'Walkthrough', to: '/#walkthrough' },
  { label: 'The science', to: '/science' },
  { label: 'FAQ', to: '/#faq' },
];

const navLink = 'rounded-[var(--radius-control)] px-3.5 py-2 text-small font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white';

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAppAuth();
  const primary = isSignedIn ? { label: 'Open the app', to: '/app' } : { label: 'Use our app', to: '/use' };

  return (
    <header className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 px-3 sm:top-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="mx-auto flex h-14 max-w-[960px] items-center justify-between gap-4 rounded-[calc(var(--radius-control)+8px)] border border-white/10 bg-[#070b18]/90 pr-2 pl-5 shadow-[0_8px_32px_rgb(0_0_0/0.35)] md:bg-[#070b18]/60 md:backdrop-blur-xl">
        <Link to="/" aria-label="PitchSafe home">
          <Wordmark className="text-white" />
        </Link>

        <nav aria-label="Main" className="hidden items-center md:flex">
          {NAV.map((item) => (
            <Link key={item.label} to={item.to} className={navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          {!isSignedIn && (
            <Link to="/sign-in" className={cn(navLink, 'hidden sm:inline-flex')}>
              Sign in
            </Link>
          )}
          <Button asChild variant="inverse" size="sm" className="h-10 px-4">
            <Link to={primary.to}>{primary.label}</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" fillClassName={GHOST_WASH} className="size-10 md:hidden" aria-label="Open menu">
                <List aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="site-night p-6">
              <SheetTitle className="mb-6">
                <Wordmark />
              </SheetTitle>
              <SheetDescription className="sr-only">Site menu</SheetDescription>
              <nav aria-label="Mobile" className="flex flex-col">
                {NAV.map((item) => (
                  <Link key={item.label} to={item.to} onClick={() => setOpen(false)} className="border-b border-line px-1 py-4 text-lead font-medium text-ink hover:text-accent-ink">
                    {item.label}
                  </Link>
                ))}
              </nav>
              {!isSignedIn && (
                <Button asChild variant="secondary" className="mt-auto h-12">
                  <Link to="/sign-in" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                </Button>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
