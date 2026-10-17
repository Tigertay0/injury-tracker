// Paired bars per movement type: this week against the player's usual week. Two series
// with a legend; values are printed beside the bars, and a table serves screen readers.
// It is a dashboard tile: the rows that need attention come first, and the rows that do not fit
// sit behind "See all".
import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { MOVEMENT_LABEL, SCORED_TYPES, type MovementStatus, type MovementSummary } from '@shared/movement';
import { RiskChip } from '@/components/risk-chip';
import type { Tone } from '@/lib/labels';
import { useAppBase } from '@/lib/player-data';
import { TILE_TITLES } from './dashboard-order';
import { FitList } from './dashboard-tiles/fit-list';
import { TileShell } from './dashboard-tiles/tile-shell';

export const LEVEL_CHIP: Partial<Record<MovementStatus['level'], { tone: Tone; text: string }>> = {
  CAUTION: { tone: 'high', text: 'Rising' },
  DANGER: { tone: 'very-high', text: 'Spike' },
};

const NO_BASELINE = 'No baseline yet';

const DESCRIPTION = 'Minutes of each kind of movement from your drills, against your usual week. Sessions without drills count as zero. Drill profiles are estimates.';

/** Minutes are shown whole; the bars use the same rounded values so they match the numbers. */
const whole = (minutes: number) => Math.round(minutes);

/** Bar width as a percent of the shared scale, kept within 0 to 100. */
const barWidth = (value: number, max: number) => {
  const pct = (value / max) * 100;
  return `${Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0}%`;
};

/** Strength is shown but never scored, so it never gets a Rising or Spike chip. */
const chipFor = (t: MovementStatus) => (SCORED_TYPES.includes(t.type) ? LEVEL_CHIP[t.level] : undefined);

const statusText = (t: MovementStatus) => chipFor(t)?.text ?? (t.ratio === null ? NO_BASELINE : 'Normal');

/** A spike first, then a rise, then the rest in their usual order. */
const attention = (t: MovementStatus) => (chipFor(t) ? (t.level === 'DANGER' ? 0 : 1) : 2);

interface Row {
  status: MovementStatus;
  thisWeek: number;
  usualWeek: number;
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-label text-ink-2" aria-hidden>
      <span className="flex items-center gap-2"><span className="h-2 w-4 rounded-[var(--radius-chip)] bg-chart-past" />Usual week</span>
      <span className="flex items-center gap-2"><span className="h-2 w-4 rounded-[var(--radius-chip)] bg-chart-now" />This week</span>
    </div>
  );
}

function MovementRow({ status: t, thisWeek, usualWeek, max }: Row & { max: number }) {
  const chip = chipFor(t);
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="text-small font-semibold text-ink">{MOVEMENT_LABEL[t.type]}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {chip && <RiskChip tone={chip.tone}>{chip.text}</RiskChip>}
          {t.ratio === null && <span className="text-label text-ink-3">{NO_BASELINE}</span>}
          <span className="tnum text-label text-ink-2">
            <span className="hidden @[440px]:inline">This week </span>
            {thisWeek} min · usual {usualWeek}
          </span>
        </span>
      </div>
      <div className="mt-1.5 grid gap-[2px]">
        <div className="h-2 rounded-[var(--radius-chip)] bg-chart-past" style={{ width: barWidth(usualWeek, max) }} />
        <div className="h-2 rounded-[var(--radius-chip)] bg-chart-now" style={{ width: barWidth(thisWeek, max) }} />
      </div>
    </div>
  );
}

function NotReady() {
  const base = useAppBase();
  return (
    <>
      <p className="text-body text-ink-2">
        This shows how your sprinting, jumping and other movement this week compares with your usual week. It needs drills on your sessions in at least three different weeks.
      </p>
      <Link to={`${base}/log`} className="mt-auto inline-flex items-center gap-1 self-start text-small font-semibold text-accent-ink underline-offset-2 hover:underline">
        Add drills to a session
        <ArrowRight aria-hidden weight="bold" className="size-3.5" />
      </Link>
    </>
  );
}

export function MovementTile({ movement }: { movement: MovementSummary }) {
  const rows = useMemo<Row[]>(
    () =>
      movement.types
        .map((t) => ({ status: t, thisWeek: whole(t.thisWeek), usualWeek: whole(t.usualWeek) }))
        .filter((r) => r.thisWeek > 0 || r.usualWeek > 0)
        .sort((a, b) => attention(a.status) - attention(b.status)),
    [movement],
  );
  const max = Math.max(1, ...rows.flatMap((r) => [r.thisWeek, r.usualWeek]).filter(Number.isFinite));

  return (
    <TileShell title={TILE_TITLES.movement} titleId="movement-title" meta={movement.ready ? <Legend /> : undefined}>
      {movement.ready ? (
        <>
          <p className="hidden text-label text-ink-2 @[440px]:block">{DESCRIPTION}</p>
          <FitList
            items={rows}
            keyOf={(r) => r.status.type}
            renderItem={(r) => <MovementRow {...r} max={max} />}
            noun="movements"
            listHidden
            listClassName="flex flex-col gap-3"
          />
          <p className="text-caption text-ink-3 @[440px]:hidden">Drill profiles are estimates. Sessions without drills count as zero.</p>

          {/* Tables ignore width:1px, so the visually hidden wrapper is a div */}
          <div className="sr-only">
            <table>
              <caption>Movement this week against your usual week, in minutes</caption>
              <thead>
                <tr><th scope="col">Movement</th><th scope="col">This week</th><th scope="col">Usual week</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                {rows.map(({ status: t, thisWeek, usualWeek }) => (
                  <tr key={t.type}>
                    <th scope="row">{MOVEMENT_LABEL[t.type]}</th>
                    <td>{thisWeek}</td>
                    <td>{usualWeek}</td>
                    <td>{statusText(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <NotReady />
      )}
    </TileShell>
  );
}
