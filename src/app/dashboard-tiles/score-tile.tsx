// The injury risk score tile: the score and its zone, the one-line verdict and the first action. Until
// there is a score it shows the baseline progress, or asks for the first session.
import { Link } from 'react-router';
import { Plus } from '@phosphor-icons/react';
import type { RiskModel } from '@shared/risk-model';
import { RiskChip } from '@/components/risk-chip';
import { Button } from '@/components/ui/button';
import { COMPOSITE_LABEL, COMPOSITE_TONE, COMPOSITE_VERDICT, TONE_TEXT } from '@/lib/labels';
import { useAppBase } from '@/lib/player-data';
import { cn } from '@/lib/utils';
import { BIG_NUMBER, TileShell } from './tile-shell';

const LINK = 'font-semibold text-accent-ink underline underline-offset-2';

/** The title of the score tile in each of its three states, which is also the tile's accessible name. */
export function scoreTitle(model: RiskModel, hasSessions: boolean): string {
  if (model.composite) return 'Injury risk score';
  return hasSessions ? 'Building your baseline' : 'Log your first session';
}

function Assumptions({ model }: { model: RiskModel }) {
  const base = useAppBase();
  if (model.assumptions.length === 0) return null;
  return (
    <p className="text-label text-ink-2">
      {model.assumptions.includes('NO_RECENT_CHECKIN') && (
        <>
          No check-in in the last two weeks, so recovery is counted as moderate.{' '}
          <Link to={`${base}/recovery`} className={LINK}>
            Do this week's check-in
          </Link>
          .{' '}
        </>
      )}
      {model.assumptions.includes('NO_EQUIPMENT') && (
        <>
          Cleats not set, so equipment is counted as medium risk.{' '}
          <Link to={`${base}/equipment`} className={LINK}>
            Set your cleats
          </Link>
          .
        </>
      )}
    </p>
  );
}

function Score({ model, composite }: { model: RiskModel; composite: NonNullable<RiskModel['composite']> }) {
  const { score, zone } = composite;
  const top = model.recommendations[0];
  return (
    <TileShell title="Injury risk score" titleId="verdict-title" className="overflow-y-auto">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="flex items-baseline gap-2">
          <span className={cn('tnum font-display text-display-m font-bold @[400px]:text-score', TONE_TEXT[COMPOSITE_TONE[zone]])}>{score}</span>
          <span className="tnum text-lead font-semibold text-ink-3">/ 100</span>
        </p>
        <RiskChip tone={COMPOSITE_TONE[zone]}>{COMPOSITE_LABEL[zone]}</RiskChip>
      </div>
      <div className="mt-auto flex flex-col gap-3">
        <p className="text-body font-semibold text-ink @[400px]:text-lead">{COMPOSITE_VERDICT[zone]}</p>
        {top && (
          <div className={cn('hidden rounded-[var(--radius-control)] p-4 @[440px]:block', top.urgent ? 'bg-risk-very-high-soft' : 'bg-sunken')}>
            <p className={cn('text-label font-semibold', top.urgent ? 'text-risk-very-high' : 'text-ink-2')}>Do this first</p>
            <p className="mt-1 text-small text-ink">{top.text}</p>
          </div>
        )}
        <Assumptions model={model} />
      </div>
    </TileShell>
  );
}

function Baseline({ daysCovered }: { daysCovered: number }) {
  const pct = Math.round((daysCovered / 28) * 100);
  return (
    <TileShell title="Building your baseline" titleId="baseline-title" className="overflow-y-auto">
      <p className="flex items-baseline gap-2">
        <span className={cn(BIG_NUMBER, 'text-display-m')}>Day {daysCovered}</span>
        <span className="tnum text-lead font-semibold text-ink-3">of 28</span>
      </p>
      <div className="mt-auto flex flex-col gap-3">
        <div
          className="h-2.5 w-full overflow-hidden rounded-[var(--radius-chip)] bg-accent-soft"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={28}
          aria-valuenow={daysCovered}
          aria-label="Days of training history"
        >
          <div className="h-full rounded-[var(--radius-chip)] bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-small text-ink-2">
          Your risk score needs four weeks of history to know what normal looks like for you. Keep logging every session. Your cleat and recovery checks already count.
        </p>
      </div>
    </TileShell>
  );
}

function FirstSession() {
  const base = useAppBase();
  return (
    <TileShell title="Log your first session" titleId="first-session-title" className="overflow-y-auto">
      <p className="text-body text-ink-2">
        Every session counts, easy ones included. After four weeks of logging you get your full risk score. Your cleat and recovery checks work today.
      </p>
      <Button asChild size="lg" className="mt-auto self-start">
        <Link to={`${base}/log`}>
          <Plus aria-hidden weight="bold" />
          Log a session
        </Link>
      </Button>
    </TileShell>
  );
}

export function ScoreTile({ model, hasSessions }: { model: RiskModel; hasSessions: boolean }) {
  if (model.composite) return <Score model={model} composite={model.composite} />;
  if (!hasSessions) return <FirstSession />;
  return <Baseline daysCovered={model.baseline.daysCovered} />;
}
