import { describe, expect, it } from 'vitest';
import { countThatFit, fitState, footerMode } from '@/app/dashboard-tiles/fit';

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

describe('fitState', () => {
  const reserve = 44;

  it('shows everything and hides nothing when the list fits', () => {
    expect(fitState([100, 100], 8, 300, reserve)).toEqual({ count: 2, hidden: 0, cramped: false });
  });

  it('hides what does not fit, keeping room for the button', () => {
    expect(fitState([100, 100, 100], 8, 252, reserve)).toEqual({ count: 2, hidden: 1, cramped: false });
  });

  it('is cramped when even the first item will not fit beside the button, and then hides nothing', () => {
    expect(fitState([200, 100], 8, 220, reserve)).toEqual({ count: 1, hidden: 0, cramped: true });
  });

  it('is cramped for a single item taller than the room', () => {
    expect(fitState([300], 8, 200, reserve)).toEqual({ count: 1, hidden: 0, cramped: true });
  });

  it('is not cramped for a single item that fits', () => {
    expect(fitState([150], 8, 200, reserve)).toEqual({ count: 1, hidden: 0, cramped: false });
  });

  it('is empty for an empty list', () => {
    expect(fitState([], 8, 200, reserve)).toEqual({ count: 0, hidden: 0, cramped: false });
  });

  it('stops hiding anything when a bigger tile makes everything fit (so an open list can close)', () => {
    const heights = [100, 100, 100];
    expect(fitState(heights, 8, 252, reserve).hidden).toBe(1);
    expect(fitState(heights, 8, 316, reserve).hidden).toBe(0);
  });
});

describe('footerMode', () => {
  it('lets the footer follow the list when nothing is hidden', () => {
    expect(footerMode({ count: 2, hidden: 0, cramped: false })).toBe('flow');
  });

  it('pins the footer when "See all" is showing', () => {
    expect(footerMode({ count: 1, hidden: 2, cramped: false })).toBe('pinned');
  });

  it('pins the footer in a cramped tile, so only the notes scroll', () => {
    expect(footerMode({ count: 1, hidden: 0, cramped: true })).toBe('pinned');
  });
});
