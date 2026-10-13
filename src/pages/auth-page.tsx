import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { authConfigured } from '@/lib/auth';

/** Frame for Clerk's sign-in and sign-up screens. */
export function AuthPage({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center px-5 pt-10 pb-20 sm:px-8 md:pt-14">
      <h1 className="sr-only">{title}</h1>
      {authConfigured ? (
        <div className="min-h-[34rem]">{children}</div>
      ) : (
        <div className="max-w-md rounded-[var(--radius-panel)] border border-line bg-surface p-8 text-center">
          <p className="text-lead font-semibold text-ink">Sign-in is not switched on yet.</p>
          <p className="mt-2 text-body text-ink-2">Accounts open as soon as the site's login service is connected.</p>
          <Link to="/" className="mt-6 inline-block text-small font-semibold text-accent-ink underline underline-offset-4">
            Back to the home page
          </Link>
        </div>
      )}
      {note && authConfigured && <p className="mt-4 text-label text-ink-2">{note}</p>}
    </div>
  );
}
