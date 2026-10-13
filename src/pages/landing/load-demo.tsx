// The landing hero's working demo: drag this week's training and watch the real
// ACWR calculation move through the zones. Sample data, clearly labelled.
import { useMemo, useState } from 'react';
import { acuteLoad, acwrZone, calculateACWR, chronicLoad, dailyLoads } from '@shared/calculations';
import { addDays, localToday } from '@shared/dates';
import type { TrainingSession } from '@shared/types';
import { LoadChart } from '@/components/load-chart';
import { RiskChip } from '@/components/risk-chip';
import { TextSwap } from '@/components/text-swap';
import { Slider } from '@/components/ui/slider';
import { ACWR_LABEL, ACWR_MEANING, ACWR_TONE } from '@/lib/labels';
import { ZoneRuler } from './zone-ruler';

// A typical week for the sample midfielder: two trainings, a gym day and a match
const WEEK_PATTERN: { offset: number; type: TrainingSession['type']; duration: number; rpe: number }[] = [
  { offset: 0, type: 'training', duration: 75, rpe: 6 },
  { offset: 2, type: 'training', duration: 90, rpe: 5 },
  { offset: 3, type: 'gym', duration: 45, rpe: 6 },
  { offset: 5, type: 'match', duration: 90, rpe: 8 },
];
const EARLIER_WEEK_SCALE = [0.92, 1.06, 1.02];
const DEFAULT_SCALE = 1.6;

function sampleSessions(today: string, thisWeekScale: number): TrainingSession[] {
  const start = addDays(today, -27);
  return [0, 1, 2, 3].flatMap((week) =>
    WEEK_PATTERN.map((s) => {
      const scale = week === 3 ? thisWeekScale : EARLIER_WEEK_SCALE[week];
      const duration = Math.max(1, Math.round(s.duration * scale));
      return { id: `w${week}-${s.offset}`, date: addDays(start, week * 7 + s.offset), type: s.type, duration, rpe: s.rpe, load: duration * s.rpe, notes: '' };
    }),
  );
}

export function LoadDemo() {
  const today = useMemo(() => localToday(), []);
  const [scale, setScale] = useState(DEFAULT_SCALE);

  const model = useMemo(() => {
    const sessions = sampleSessions(today, scale);
    const acwr = calculateACWR(sessions, today) ?? 0;
    return {
      acwr,
      zone: acwrZone(acwr),
      days: dailyLoads(sessions, today, 28),
      acute: acuteLoad(sessions, today),
      chronic: chronicLoad(sessions, today),
    };
  }, [today, scale]);

  return (
    <div className="shadow-lift rounded-[var(--radius-panel)] border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-small font-semibold text-ink">Sample player, last 28 days</p>
        <p className="text-label text-ink-3">Example data</p>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-label font-semibold text-ink-2">Workload ratio (ACWR)</p>
          <p className="tnum font-display text-display-s font-extrabold text-ink" aria-live="polite">
            {model.acwr.toFixed(2)}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 basis-56 flex-col items-start gap-1.5 sm:items-end sm:text-right">
          <RiskChip tone={ACWR_TONE[model.zone]}>
            <TextSwap text={ACWR_LABEL[model.zone]} />
          </RiskChip>
          <p className="min-h-[2.8em] text-small text-ink-2">{ACWR_MEANING[model.zone]}</p>
        </div>
      </div>

      <ZoneRuler value={model.acwr} className="mt-4" />

      <LoadChart
        className="mt-6"
        days={model.days}
        highlightFrom={21}
        referenceDaily={model.chronic / 7}
        title="Daily training load for the sample player over 28 days"
        height={170}
      />

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <label id="demo-slider-label" className="text-small font-semibold text-ink">
            Drag this week's training
          </label>
          <span className="tnum text-small font-semibold text-ink-2">{scale.toFixed(1)}× normal</span>
        </div>
        <Slider
          aria-labelledby="demo-slider-label"
          aria-valuetext={`${scale.toFixed(1)} times a normal week`}
          min={0.4}
          max={2.2}
          step={0.1}
          value={[scale]}
          onValueChange={([v]) => setScale(v)}
        />
        <div className="flex justify-between text-caption text-ink-3">
          <span>Lighter week</span>
          <span>Heavier week</span>
        </div>
      </div>
    </div>
  );
}
