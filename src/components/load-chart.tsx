// 28-day training-load columns. Mechanisms adapted from 21st.dev bklitai/bar-chart
// (https://21st.dev/@bklitai/components/bar-chart): rounded data-ends, faded
// neighbours on hover, a value-first tooltip. Rebuilt as plain SVG (no visx/Motion)
// so it can render in the landing hero, and to the dataviz mark specs.
import { useId, useMemo, useState } from 'react';
import { fmtDate, fmtWeekday } from '@/lib/labels';
import { cn } from '@/lib/utils';

export interface DayLoad {
  date: string;
  load: number;
}

interface LoadChartProps {
  days: readonly DayLoad[];
  /** Columns from this index on are "this week" and drawn in the accent. */
  highlightFrom: number;
  /** Average daily load over 28 days, drawn as a dashed reference line. */
  referenceDaily?: number;
  title: string;
  className?: string;
  height?: number;
}

const VIEW_W = 560;
const BAR_MAX = 24;
const GAP = 2;
const RADIUS = 4;

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  return (steps.find((s) => s * pow >= value) ?? 10) * pow;
}

/** Column path with a 4px rounded top and a square base. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

export function LoadChart({ days, highlightFrom, referenceDaily, title, className, height = 200 }: LoadChartProps) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);

  const geom = useMemo(() => {
    const max = niceMax(Math.max(...days.map((d) => d.load), referenceDaily ?? 0) * 1.08);
    const slot = VIEW_W / days.length;
    const barW = Math.min(BAR_MAX, slot - GAP);
    const top = 8;
    const plotH = height - top;
    const y = (v: number) => top + plotH - (v / max) * plotH;
    return { max, slot, barW, y, top, plotH };
  }, [days, referenceDaily, height]);

  const ticks = [geom.max, geom.max / 2];
  const activeDay = active === null ? null : days[active];

  return (
    <figure className={cn('relative', className)}>
      <figcaption className="sr-only">{title}</figcaption>
      <div
        className="relative rounded-[var(--radius-control)] outline-offset-4"
        tabIndex={0}
        aria-label={`${title}. Use the arrow keys to read each day.`}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((a) => a ?? days.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          const step = e.key === 'ArrowRight' ? 1 : -1;
          setActive((a) => Math.min(days.length - 1, Math.max(0, (a ?? days.length - 1) + step)));
        }}
      >
        {/* Y ticks as HTML so they stay crisp at any width */}
        {ticks.map((t) => (
          <span key={t} className="tnum pointer-events-none absolute left-0 -translate-y-full pb-0.5 text-caption text-ink-3" style={{ top: `${(geom.y(t) / height) * 100}%` }}>
            {t.toLocaleString('en-US')}
          </span>
        ))}
        <svg viewBox={`0 0 ${VIEW_W} ${height}`} className="block h-auto w-full overflow-visible" role="img" aria-labelledby={`${id}-desc`}>
          <desc id={`${id}-desc`}>{title}. Table of values follows.</desc>
          {ticks.map((t) => (
            <line key={t} x1={0} x2={VIEW_W} y1={geom.y(t)} y2={geom.y(t)} stroke="var(--chart-grid)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          <line x1={0} x2={VIEW_W} y1={geom.y(0)} y2={geom.y(0)} stroke="var(--line-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {days.map((d, i) => {
            const h = (d.load / geom.max) * geom.plotH;
            const x = i * geom.slot + (geom.slot - geom.barW) / 2;
            const now = i >= highlightFrom;
            const faded = active !== null && active !== i;
            return (
              <g key={d.date}>
                {h > 0 && (
                  <path
                    d={columnPath(x, geom.y(d.load), geom.barW, h)}
                    fill={now ? 'var(--chart-now)' : 'var(--chart-past)'}
                    style={{ opacity: faded ? 0.4 : 1, transition: 'opacity 160ms ease, d 240ms var(--ease-out)' }}
                  />
                )}
                {/* Hit target: the full column slot, larger than the mark */}
                <rect
                  x={i * geom.slot}
                  y={0}
                  width={geom.slot}
                  height={height}
                  fill="transparent"
                  tabIndex={-1}
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                />
              </g>
            );
          })}

          {referenceDaily !== undefined && referenceDaily > 0 && (
            <line
              x1={0}
              x2={VIEW_W}
              y1={geom.y(referenceDaily)}
              y2={geom.y(referenceDaily)}
              stroke="var(--ink-2)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {activeDay && active !== null && (
          <div
            role="status"
            className="shadow-overlay pointer-events-none absolute top-0 z-10 min-w-32 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2"
            style={{
              left: `${((active + 0.5) / days.length) * 100}%`,
              transform: `translateX(${active > days.length / 2 ? '-105%' : '5%'})`,
            }}
          >
            <p className="tnum text-body font-semibold text-ink">{activeDay.load.toLocaleString('en-US')} load</p>
            <p className="text-label text-ink-2">
              {fmtWeekday(activeDay.date)} {fmtDate(activeDay.date)}
              {active >= highlightFrom ? ', this week' : ''}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-between text-caption text-ink-3">
        <span>{fmtDate(days[0].date)}</span>
        <span>{fmtDate(days[days.length - 1].date)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-3 rounded-[2px] bg-chart-past" />
          Earlier weeks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-3 rounded-[2px] bg-chart-now" />
          Last 7 days
        </span>
        {referenceDaily !== undefined && referenceDaily > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="w-4 border-t-[1.5px] border-dashed border-ink-2" />
            4-week daily average
          </span>
        )}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Load</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{fmtDate(d.date, true)}</td>
              <td>{d.load}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
