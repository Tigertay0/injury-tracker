// Route wrapper that loads Clerk for sign-in, "Use our app" and the app itself.
import { useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { ClerkProvider, useAuth } from '@clerk/react';
import { CLERK_PUBLISHABLE_KEY } from '@/config';
import { AppAuthContext } from './auth';

// Clerk's prebuilt screens read the same CSS tokens as the rest of the app. Shared with the
// Plus card in Settings, whose pricing table and checkout need the same look. The --ps-clerk-*
// copies (styles.css) avoid Clerk's own internal --accent property, which would self-reference.
export const clerkAppearance = {
  variables: {
    colorPrimary: 'var(--ps-clerk-accent)',
    colorPrimaryForeground: 'var(--ps-clerk-on-accent)',
    colorForeground: 'var(--ps-clerk-ink)',
    colorMutedForeground: 'var(--ps-clerk-ink-2)',
    colorBackground: 'var(--ps-clerk-surface)',
    colorInput: 'var(--ps-clerk-surface)',
    colorInputForeground: 'var(--ps-clerk-ink)',
    colorBorder: 'var(--ps-clerk-line-strong)',
    colorDanger: 'var(--ps-clerk-danger)',
    colorSuccess: 'var(--ps-clerk-success)',
    fontFamily: 'var(--font-sans)',
    borderRadius: '12px',
  },
  elements: {
    // Account deletion must go through Settings so PitchSafe data is erased first
    profileSection__danger: { display: 'none' },
  },
};

function Bridge() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  // getToken is passed through as-is so useApi() stays memoised
  const value = useMemo(() => ({ isLoaded, isSignedIn: Boolean(isSignedIn), getToken }), [isLoaded, isSignedIn, getToken]);
  return (
    <AppAuthContext.Provider value={value}>
      <Outlet />
    </AppAuthContext.Provider>
  );
}

export default function ClerkRoot() {
  const navigate = useNavigate();
  if (!CLERK_PUBLISHABLE_KEY) return <Outlet />;
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/app"
      signUpFallbackRedirectUrl="/app"
      afterSignOutUrl="/"
      appearance={clerkAppearance}
    >
      <Bridge />
    </ClerkProvider>
  );
}
