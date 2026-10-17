import { describe, expect, it } from 'vitest';
import { COMPOSITE_SCORE_MAX, COMPOSITE_ZONE_MAX, COMPOSITE_ZONES, compositeScore, compositeZone } from '@shared/calculations';
import { GAUGE_MAX, gaugeSegments, gaugeTicks, markerPosition } from '@/app/dashboard-tiles/zones';

describe('the shared zone thresholds', () => {
  it('are the ones compositeZone uses', () => {
    expect(compositeZone(COMPOSITE_ZONE_MAX.LOW)).toBe('LOW');
    expect(compositeZone(COMPOSITE_ZONE_MAX.LOW + 1)).toBe('MODERATE');
    expect(compositeZone(COMPOSITE_ZONE_MAX.MODERATE)).toBe('MODERATE');
    expect(compositeZone(COMPOSITE_ZONE_MAX.MODERATE + 1)).toBe('HIGH');
    expect(compositeZone(COMPOSITE_ZONE_MAX.HIGH)).toBe('HIGH');
    expect(compositeZone(COMPOSITE_ZONE_MAX.HIGH + 1)).toBe('VERY_HIGH');
  });

  it('list the four zones from low to very high', () => {
    expect(COMPOSITE_ZONES).toEqual(['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']);
  });
});

describe('the top of the scale', () => {
  it('is the cap compositeScore applies, and the gauge ends there', () => {
    expect(compositeScore({ acwrRisk: 100, recoveryRisk: 100, equipmentRisk: 100, multiplier: 2 })).toBe(COMPOSITE_SCORE_MAX);
    expect(GAUGE_MAX).toBe(COMPOSITE_SCORE_MAX);
  });
});

describe('gaugeSegments', () => {
  const segments = gaugeSegments();

  it('has one segment per zone, in order', () => {
    expect(segments.map((s) => s.zone)).toEqual([...COMPOSITE_ZONES]);
  });

  it('starts each segment where the previous zone ends, taken from the shared thresholds', () => {
    expect(segments.map((s) => s.start)).toEqual([0, COMPOSITE_ZONE_MAX.LOW + 1, COMPOSITE_ZONE_MAX.MODERATE + 1, COMPOSITE_ZONE_MAX.HIGH + 1]);
  });

  it('covers 0 to 100 without a gap or an overlap', () => {
    expect(segments[0].start).toBe(0);
    expect(segments[segments.length - 1].end).toBe(GAUGE_MAX);
    for (let i = 1; i < segments.length; i++) expect(segments[i].start).toBe(segments[i - 1].end);
    expect(segments.reduce((sum, s) => sum + s.end - s.start, 0)).toBe(GAUGE_MAX);
  });

  it('gives each segment a width in proportion to the scores it covers', () => {
    expect(segments.map((s) => s.end - s.start)).toEqual([31, 29, 20, 20]);
  });
});

describe('markerPosition', () => {
  const segments = gaugeSegments();

  it('puts every score from 0 to 100 in the segment of its own zone', () => {
    for (let score = 0; score <= 100; score++) {
      const { index } = markerPosition(score);
      expect(segments[index].zone).toBe(compositeZone(score));
    }
  });

  it('keeps the fraction inside the segment', () => {
    for (let score = 0; score <= 100; score++) {
      const { fraction } = markerPosition(score);
      expect(fraction).toBeGreaterThanOrEqual(0);
      expect(fraction).toBeLessThanOrEqual(1);
    }
  });

  it('puts the first score of a zone at the start of its segment and the top score at the end', () => {
    expect(markerPosition(0)).toEqual({ index: 0, fraction: 0 });
    expect(markerPosition(31)).toEqual({ index: 1, fraction: 0 });
    expect(markerPosition(60)).toEqual({ index: 2, fraction: 0 });
    expect(markerPosition(80)).toEqual({ index: 3, fraction: 0 });
    expect(markerPosition(100)).toEqual({ index: 3, fraction: 1 });
  });

  it('places a score in the middle of a zone in proportion', () => {
    expect(markerPosition(70)).toEqual({ index: 2, fraction: 0.5 });
  });

  it('clamps scores outside the scale and survives junk', () => {
    expect(markerPosition(-5)).toEqual({ index: 0, fraction: 0 });
    expect(markerPosition(250)).toEqual({ index: 3, fraction: 1 });
    expect(markerPosition(Number.NaN)).toEqual({ index: 0, fraction: 0 });
  });
});

describe('gaugeTicks', () => {
  it('labels the lower bound of each zone and the top of the scale', () => {
    expect(gaugeTicks()).toEqual(['0', '31', '60', '80', '100']);
  });
});
