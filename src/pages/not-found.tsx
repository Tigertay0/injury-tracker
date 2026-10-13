import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-start px-5 py-24 sm:px-8">
      <p className="tnum font-display text-display-m font-bold text-ink-3">404</p>
      <h1 className="mt-2 font-display text-h1 font-bold text-ink">This page is off the pitch.</h1>
      <p className="mt-3 text-lead text-ink-2">The link may be old or mistyped.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/">Go to the home page</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/app">Open the app</Link>
        </Button>
      </div>
    </div>
  );
}
