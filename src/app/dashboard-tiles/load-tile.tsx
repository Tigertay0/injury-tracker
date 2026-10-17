// The 28-day training load: this week's load as the figure, the average week beside it, and the
// daily columns underneath.
import type { RiskModel } from '@shared/risk-model';
import { LoadChart } from '@/components/load-chart';
import { ACWR_MEANING } from '@/lib/labels';
import type { WidgetSize } from '@/lib/widget-layout';
import { TILE_TITLES } from '../dashboard-order';
import { BIG_NUMBER, TileShell } from './tile-shell';

/** Chart height in the chart's own units: a wide tile has only about 90px to give it, a narrow phone about 80. */
const CHART_HEIGHT = { wide: 110, compact: 140, roomy: 200 } as const;

interface LoadTileProps {
  model: RiskModel;
  size: WidgetSize;
  /** The narrowest phones, where a large tile is only about 290px square. */
  compact: boolean;
}

export function LoadTile({ model, size, compact }: LoadTileProps) {
  const thisWeek = model.acute;
  const avgWeek = model.chronic;
  const roomy = size === 'lg' || size === 'tall';
  return (
    <TileShell title={TILE_TITLES.load} titleId="load-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex items-baseline gap-2">
          <span className={BIG_NUMBER}>{thisWeek.toLocaleString('en-US')}</span>
          <span className="text-label text-ink-2">this week</span>
        </p>
        <p className="tnum text-label text-ink-2">Average week {avgWeek.toLocaleString('en-US')}</p>
      </div>
      {roomy && <p className="hidden text-small text-ink-2 @[340px]:block">{ACWR_MEANING[model.acwrZone]}</p>}
      <LoadChart
        className="mt-auto pt-3"
        days={model.days}
        highlightFrom={21}
        referenceDaily={avgWeek / 7}
        title="Your daily training load over the last 28 days"
        height={roomy ? (compact ? CHART_HEIGHT.compact : CHART_HEIGHT.roomy) : CHART_HEIGHT.wide}
        showDates={roomy}
        datesClassName="hidden @[340px]:flex"
      />
    </TileShell>
  );
}
