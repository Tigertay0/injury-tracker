import { describe, expect, it } from 'vitest';
import { countThatFit } from '@/app/dashboard-tiles/fit';

describe('countThatFit', () => {
  const reserve = 44; // the "See all" button and the gap above it

  it('shows everything when it all fits, with no room kept for the button', () => {
    expect(countThatFit([100, 100, 100], 8, 316, reserve)).toBe(3);
    expect(countThatFit([100, 100, 100], 8, 400, reserve)).toBe(3);
  });

  it('keeps room for the button once something has to be hidden', () => {
    // 100 + 8 + 100 + 8 + 100 = 316 does not fit in 315, so the button is needed
    expect(countThatFit([100, 100, 100], 8, 315, reserve)).toBe(2);
    // two items (208) plus the button (44) fit in 252, three do not
    expect(countThatFit([100, 100, 100], 8, 252, reserve)).toBe(2);
    expect(countThatFit([100, 100, 100], 8, 251, reserve)).toBe(1);
  });

  it('never cuts an item: a tall item stays out rather than showing part of it', () => {
    expect(countThatFit([60, 200, 60], 8, 200, reserve)).toBe(1);
  });

  it('always shows at least the first item, even in a tile too small for it', () => {
    expect(countThatFit([500, 100], 8, 120, reserve)).toBe(1);
    expect(countThatFit([500], 8, 0, reserve)).toBe(1);
  });

  it('copes with an empty list', () => {
    expect(countThatFit([], 8, 300, reserve)).toBe(0);
  });

  it('counts the gap only between items', () => {
    expect(countThatFit([50], 8, 50, reserve)).toBe(1);
    expect(countThatFit([50, 50], 8, 108, reserve)).toBe(2);
    expect(countThatFit([50, 50], 8, 107, reserve)).toBe(1);
  });
});
