// Auth state shared through context so marketing pages never load the Clerk SDK.
// The Clerk-backed value is supplied by ClerkRoot (src/lib/clerk-root.tsx), which only
// wraps the routes that need sign-in.
import { createContext, useContext } from 'react';
import { CLERK_PUBLISHABLE_KEY } from '@/config';

export const authConfigured = Boolean(CLERK_PUBLISHABLE_KEY);

export interface AppAuth {
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
}

const signedOut: AppAuth = { isLoaded: true, isSignedIn: false, getToken: async () => null };

export const AppAuthContext = createContext<AppAuth>(signedOut);

export function useAppAuth(): AppAuth {
  return useContext(AppAuthContext);
}
