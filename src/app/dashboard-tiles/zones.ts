// Geometry of the risk zone gauge on the score tile. The zone bounds come from shared/calculations.ts,
// the same constants `compositeZone` uses, so the gauge cannot drift from the score's zones.
import { COMPOSITE_SCORE_MAX, COMPOSITE_ZONE_MAX, COMPOSITE_ZONES } from '@shared/calculations';
import type { CompositeZone } from '@shared/types';

/** The top of the score scale: the cap the score itself has. */
export const GAUGE_MAX = COMPOSITE_SCORE_MAX;

export interface GaugeSegment {
  zone: CompositeZone;
  /** The lowest score in the zone. */
  start: number;
  /** Where the next zone starts, or the top of the scale for the last one. */
  end: number;
}

/** The lowest score of each zone: 0, then one above the top of the zone before it. */
const STARTS: readonly number[] = [0, COMPOSITE_ZONE_MAX.LOW + 1, COMPOSITE_ZONE_MAX.MODERATE + 1, COMPOSITE_ZONE_MAX.HIGH + 1];

export function gaugeSegments(): GaugeSegment[] {
  return COMPOSITE_ZONES.map((zone, i) => ({ zone, start: STARTS[i], end: STARTS[i + 1] ?? GAUGE_MAX }));
}

/** Which segment a score falls in, and how far along that segment it is (0 to 1). */
export function markerPosition(score: number): { index: number; fraction: number } {
  const clamped = Number.isFinite(score) ? Math.min(GAUGE_MAX, Math.max(0, score)) : 0;
  const segments = gaugeSegments();
  let index = segments.length - 1;
  while (index > 0 && clamped < segments[index].start) index -= 1;
  const { start, end } = segments[index];
  return { index, fraction: (clamped - start) / (end - start) };
}

/** Caption labels under the gauge: where each zone starts, and the top of the scale. */
export function gaugeTicks(): string[] {
  return [...STARTS.map(String), String(GAUGE_MAX)];
}
