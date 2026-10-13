import { Link } from 'react-router';
import { Wordmark } from '@/components/wordmark';
import { CONTACT_EMAIL } from '@/config';

const LINKS = [
  { label: 'How it works', to: '/#how' },
  { label: 'The science', to: '/science' },
  { label: 'Use our app', to: '/use' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-ground">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-12 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="max-w-md">
          <Wordmark />
          <p className="mt-3 text-small text-ink-2">Free injury-risk tracking for amateur soccer players.</p>
          <p className="mt-4 text-label text-ink-2">
            PitchSafe is an educational tool, not a medical device. If something hurts, stop training and see a physio or doctor.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap content-start gap-x-6 gap-y-3 md:justify-end">
          {LINKS.map((l) => (
            <Link key={l.label} to={l.to} className="text-small text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              {l.label}
            </Link>
          ))}
          {CONTACT_EMAIL && (
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-small text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              Contact
            </a>
          )}
        </nav>
      </div>
      <div className="mx-auto max-w-[1200px] px-5 pb-8 text-caption text-ink-3 sm:px-8">© 2026 PitchSafe</div>
    </footer>
  );
}
