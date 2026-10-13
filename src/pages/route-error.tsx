// Route error screen. After a new deploy an open tab can ask for code files that no
// longer exist; reload once to pick up the new version instead of showing an error.
import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button } from '@/components/ui/button';

const RELOAD_KEY = 'pitchsafe-chunk-reload';

function isStaleChunk(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);
}

export function RouteError() {
  const error = useRouteError();
  const stale = isStaleChunk(error);

  useEffect(() => {
    if (!stale) return;
    try {
      if (sessionStorage.getItem(RELOAD_KEY)) return; // already tried once this tab
      sessionStorage.setItem(RELOAD_KEY, '1');
    } catch {
      return;
    }
    window.location.reload();
  }, [stale]);

  if (!stale) console.error('[route] render failed', error);
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="grid min-h-dvh place-items-center bg-ground px-5">
      <div className="max-w-md">
        <p className="font-display text-h1 font-extrabold text-ink">{notFound ? 'Page not found' : 'Something broke on this page'}</p>
        <p className="mt-3 text-body text-ink-2">
          {stale ? 'PitchSafe was just updated. Reload to get the new version.' : 'Your data is safe. Reload the page, and if it keeps happening, go back to the home page.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button asChild variant="secondary">
            <Link to="/">Home page</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
