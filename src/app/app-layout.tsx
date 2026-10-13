// Signed-in app: Clerk gate plus the shared shell with the account menu.
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { UserButton } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { authConfigured, useAppAuth } from '@/lib/auth';
import { AppBaseContext, PlayerDataProvider } from '@/lib/player-data';
import { Shell } from './shell';
import { AppSkeleton } from './skeleton';

const AUTH_TIMEOUT_MS = 12_000;

function SignInUnavailable() {
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="max-w-sm text-center">
        <p className="font-display text-h2 font-extrabold text-ink">Can't reach sign-in</p>
        <p className="mt-2 text-body text-ink-2">Check your connection. A content blocker can also stop the sign-in service from loading.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button asChild variant="secondary">
            <Link to="/demo">See the sample</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SignInRedirect() {
  const { pathname } = useLocation();
  return <Navigate to={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`} replace />;
}

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAppAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) return;
    const t = setTimeout(() => setTimedOut(true), AUTH_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLoaded]);

  if (!authConfigured) return <Navigate to="/sign-in" replace />;
  if (!isLoaded) return <div className="app-scope min-h-dvh bg-ground text-ink">{timedOut ? <SignInUnavailable /> : <AppSkeleton />}</div>;
  if (!isSignedIn) return <SignInRedirect />;

  return (
    <div className="app-scope min-h-dvh bg-ground text-ink">
      <AppBaseContext.Provider value="/app">
        <PlayerDataProvider>
          <Shell
            user={<UserButton showName appearance={{ elements: { userButtonBox: 'flex-row-reverse', userButtonOuterIdentifier: 'text-small font-semibold text-ink' } }} />}
            compactUser={<UserButton />}
          />
        </PlayerDataProvider>
      </AppBaseContext.Provider>
    </div>
  );
}
