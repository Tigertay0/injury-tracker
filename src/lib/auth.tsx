// Clerk wiring. The publishable key is a build-time constant, so choosing the hook
// implementation once at module load keeps hook order stable.
import { ClerkProvider, useAuth } from '@clerk/react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { CLERK_PUBLISHABLE_KEY } from '@/config';

export const authConfigured = Boolean(CLERK_PUBLISHABLE_KEY);

export interface AppAuth {
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
}

function useClerkAuth(): AppAuth {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  // Pass Clerk's getToken through as-is: it is referentially stable, which keeps
  // useApi() memoized and stops data effects re-running on every render
  return { isLoaded, isSignedIn: Boolean(isSignedIn), getToken };
}

const signedOut: AppAuth = { isLoaded: true, isSignedIn: false, getToken: async () => null };
function useNoAuth(): AppAuth {
  return signedOut;
}

export const useAppAuth: () => AppAuth = authConfigured ? useClerkAuth : useNoAuth;

// Clerk's prebuilt screens read the same CSS tokens as the rest of the app
const appearance = {
  variables: {
    colorPrimary: 'var(--accent)',
    colorPrimaryForeground: 'var(--on-accent)',
    colorForeground: 'var(--ink)',
    colorMutedForeground: 'var(--ink-2)',
    colorBackground: 'var(--surface)',
    colorInput: 'var(--surface)',
    colorInputForeground: 'var(--ink)',
    colorBorder: 'var(--line-strong)',
    colorDanger: 'var(--risk-very-high)',
    colorSuccess: 'var(--risk-low)',
    fontFamily: 'var(--font-sans)',
    borderRadius: '10px',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  if (!CLERK_PUBLISHABLE_KEY) return <>{children}</>;
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
      appearance={appearance}
    >
      {children}
    </ClerkProvider>
  );
}
