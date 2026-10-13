// Paired bars per movement type: this week against the player's usual week. Two series
// with a legend; values are printed beside the bars, and a table serves screen readers.
import { MOVEMENT_LABEL, SCORED_TYPES, type MovementStatus, type MovementSummary } from '@shared/movement';
import { RiskChip } from '@/components/risk-chip';
import type { Tone } from '@/lib/labels';

const LEVEL_CHIP: Partial<Record<MovementStatus['level'], { tone: Tone; text: string }>> = {
  CAUTION: { tone: 'high', text: 'Rising' },
  DANGER: { tone: 'very-high', text: 'Spike' },
};

const NO_BASELINE = 'No baseline yet';

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

export function MovementPanel({ movement }: { movement: MovementSummary }) {
  if (!movement.ready) return null;
  const rows = movement.types
    .map((t) => ({ status: t, thisWeek: whole(t.thisWeek), usualWeek: whole(t.usualWeek) }))
    .filter((r) => r.thisWeek > 0 || r.usualWeek > 0);
  const max = Math.max(1, ...rows.flatMap((r) => [r.thisWeek, r.usualWeek]).filter(Number.isFinite));

  return (
    <section aria-labelledby="movement-title" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
      <h2 id="movement-title" className="text-lead font-semibold text-ink">
        Movement this week
      </h2>
      <p className="mt-1 text-small text-ink-2">Minutes of each kind of movement from your drills, against your usual week. Drill profiles are estimates.</p>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-label text-ink-2" aria-hidden>
        <span className="flex items-center gap-2"><span className="h-2 w-4 bg-chart-past" />Usual week</span>
        <span className="flex items-center gap-2"><span className="h-2 w-4 bg-chart-now" />This week</span>
      </div>

      <ul className="mt-4 grid gap-4" aria-hidden>
        {rows.map(({ status: t, thisWeek, usualWeek }) => {
          const chip = chipFor(t);
          return (
            <li key={t.type}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-small font-semibold text-ink">{MOVEMENT_LABEL[t.type]}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {chip && <RiskChip tone={chip.tone}>{chip.text}</RiskChip>}
                  {t.ratio === null && <span className="text-label text-ink-3">{NO_BASELINE}</span>}
                  <span className="tnum text-label text-ink-2">
                    This week {thisWeek} min · usual {usualWeek}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 grid gap-[2px]">
                <div className="h-2 bg-chart-past" style={{ width: barWidth(usualWeek, max) }} />
                <div className="h-2 bg-chart-now" style={{ width: barWidth(thisWeek, max) }} />
              </div>
            </li>
          );
        })}
      </ul>

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
    </section>
  );
}
