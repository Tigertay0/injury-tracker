// "What to do now": the advice, most urgent first. Each item opens the screen where the player can
// act on it. Items that do not fit the tile sit behind "See all".
import { Link } from 'react-router';
import { ArrowRight, WarningOctagon } from '@phosphor-icons/react';
import type { RecommendationCategory } from '@shared/recommendations';
import type { RiskModel } from '@shared/risk-model';
import { useAppBase } from '@/lib/player-data';
import { cn } from '@/lib/utils';
import { TILE_TITLES } from '../dashboard-order';
import { FitList } from './fit-list';
import { TileShell } from './tile-shell';

type Recommendation = RiskModel['recommendations'][number];

/** Where each kind of advice can be acted on, and what the link says. */
const NEXT_STEP: Record<RecommendationCategory, { path: string; label: string }> = {
  'Training load': { path: '/log', label: 'Log a session' },
  Recovery: { path: '/recovery', label: 'Do your recovery check-in' },
  Equipment: { path: '/equipment', label: 'Check your cleats' },
  'Injury history': { path: '/injuries', label: 'Review your injuries' },
  Position: { path: '/settings', label: 'Check your position' },
};

function Action({ rec, first }: { rec: Recommendation; first: boolean }) {
  const base = useAppBase();
  const next = NEXT_STEP[rec.category];
  return (
    <>
      {/* Plain text above the link, so the link's accessible name stays what it was before */}
      {first && <p className="px-2.5 pt-1 text-label font-semibold text-ink">Do this first</p>}
      {/* The whole row opens the screen where the player can act on it */}
      <Link
        to={`${base}${next.path}`}
        className={cn(
          'group flex gap-3 rounded-[var(--radius-control)] p-2.5 transition-colors duration-150 ease-out hover:bg-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
          rec.urgent && 'bg-risk-very-high-soft hover:bg-risk-very-high-soft',
        )}
      >
        {rec.urgent && <WarningOctagon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0 text-risk-very-high" />}
        <div className="min-w-0 flex-1">
          <p className={cn('text-label font-semibold', rec.urgent ? 'text-risk-very-high' : 'text-ink-2')}>
            {rec.urgent ? 'Urgent: ' : ''}
            {rec.category}
          </p>
          <p className="mt-0.5 text-label text-ink @[300px]:text-small">{rec.text}</p>
          {rec.citation && <p className="mt-1 text-caption text-ink-3">Source: {rec.citation}</p>}
          <p className="mt-2 inline-flex items-center gap-1 text-small font-semibold text-accent-ink">
            {next.label}
            <ArrowRight aria-hidden weight="bold" className="size-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
          </p>
        </div>
      </Link>
    </>
  );
}

export function ActionsTile({ recommendations }: { recommendations: readonly Recommendation[] }) {
  return (
    <TileShell title={TILE_TITLES.actions} titleId="actions-title">
      {recommendations.length > 0 ? (
        <FitList
          items={recommendations}
          keyOf={(r) => r.text}
          renderItem={(rec, i) => <Action rec={rec} first={i === 0} />}
          noun="actions"
          scrollLabel="All actions, scrollable"
          listClassName="-mx-2.5 flex flex-col gap-1"
        />
      ) : (
        <p className="text-body text-ink-2">Nothing to do right now. Keep logging every session.</p>
      )}
    </TileShell>
  );
}
