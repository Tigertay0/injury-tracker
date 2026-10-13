// Paired bars per movement type: this week against the player's usual week. Two series
// with a legend; values are printed beside the bars, and a table serves screen readers.
import { MOVEMENT_LABEL, type MovementStatus, type MovementSummary } from '@shared/movement';
import { RiskChip } from '@/components/risk-chip';
import type { Tone } from '@/lib/labels';

const LEVEL_CHIP: Partial<Record<MovementStatus['level'], { tone: Tone; text: string }>> = {
  CAUTION: { tone: 'high', text: 'Rising' },
  DANGER: { tone: 'very-high', text: 'Spike' },
};

export function MovementPanel({ movement }: { movement: MovementSummary }) {
  if (!movement.ready) return null;
  const rows = movement.types.filter((t) => t.usualWeek > 0 || t.thisWeek > 0);
  const max = Math.max(1, ...rows.flatMap((t) => [t.thisWeek, t.usualWeek]));

  return (
    <section aria-labelledby="movement-title" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
      <h2 id="movement-title" className="text-lead font-semibold text-ink">
        Movement this week
      </h2>
      <p className="mt-1 text-body text-ink-2">Minutes of each kind of movement from your drills, against your usual week. Drill profiles are estimates.</p>

      <div className="mt-4 flex gap-5 text-label text-ink-2" aria-hidden>
        <span className="flex items-center gap-2"><span className="h-2 w-4 bg-chart-past" />Usual week</span>
        <span className="flex items-center gap-2"><span className="h-2 w-4 bg-chart-now" />This week</span>
      </div>

      <ul className="mt-4 grid gap-4" aria-hidden>
        {rows.map((t) => {
          const chip = LEVEL_CHIP[t.level];
          return (
            <li key={t.type}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-small font-semibold text-ink">{MOVEMENT_LABEL[t.type]}</span>
                <span className="flex items-center gap-2">
                  {chip && <RiskChip tone={chip.tone}>{chip.text}</RiskChip>}
                  <span className="tnum text-label text-ink-2">
                    {t.thisWeek} min · usual {t.usualWeek}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 grid gap-[2px]">
                <div className="h-2 bg-chart-past" style={{ width: `${(t.usualWeek / max) * 100}%` }} />
                <div className="h-2 bg-chart-now" style={{ width: `${(t.thisWeek / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <table className="sr-only">
        <caption>Movement this week against your usual week, in minutes</caption>
        <thead>
          <tr><th scope="col">Movement</th><th scope="col">This week</th><th scope="col">Usual week</th><th scope="col">Status</th></tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.type}>
              <th scope="row">{MOVEMENT_LABEL[t.type]}</th>
              <td>{t.thisWeek}</td>
              <td>{t.usualWeek}</td>
              <td>{LEVEL_CHIP[t.level]?.text ?? (t.ratio === null ? 'Not enough data yet' : 'Normal')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
