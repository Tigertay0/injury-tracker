// Adapted from 21st.dev ln-dev7/header-17 "Classic Header with Sheet Menu"
// (https://21st.dev/@ln-dev7/components/header-17): centered nav, ghost sign-in,
// primary action, sheet menu on mobile. Restyled to PitchSafe tokens, Phosphor icons,
// router links, and auth-aware actions.
import { useState } from 'react';
import { Link } from 'react-router';
import { List } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Wordmark } from '@/components/wordmark';
import { useAppAuth } from '@/lib/auth';

const NAV = [
  { label: 'How it works', to: '/#how' },
  { label: 'The science', to: '/science' },
  { label: 'FAQ', to: '/#faq' },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAppAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-line/70 bg-ground/90 backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-ground">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link to="/" className="rounded-[6px]" aria-label="PitchSafe home">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link key={item.label} to={item.to} className="rounded-[var(--radius-control)] px-3 py-2 text-small font-medium text-ink-2 hover:bg-sunken hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isSignedIn ? (
            <Button asChild size="sm">
              <Link to="/app">Open the app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/use">Use our app</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" size="icon" className="md:hidden" aria-label="Open menu">
              <List aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-6">
            <SheetTitle className="mb-6">
              <Wordmark />
            </SheetTitle>
            <SheetDescription className="sr-only">Site menu</SheetDescription>
            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {NAV.map((item) => (
                <Link key={item.label} to={item.to} onClick={() => setOpen(false)} className="rounded-[var(--radius-control)] px-3 py-3 text-body font-medium text-ink hover:bg-sunken">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t border-line pt-6">
              {isSignedIn ? (
                <Button asChild>
                  <Link to="/app" onClick={() => setOpen(false)}>
                    Open the app
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild>
                    <Link to="/use" onClick={() => setOpen(false)}>
                      Use our app
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link to="/sign-in" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
