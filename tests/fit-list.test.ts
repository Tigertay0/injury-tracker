import { describe, expect, it } from 'vitest';
import { contentOverflows, countThatFit, fitState, focusWouldBeLost, footerMode, trailingFits } from '@/app/dashboard-tiles/fit';

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

describe('trailingFits', () => {
  it('shows the extra content when it fits under the list and the footer', () => {
    // 200 of list, 8 gap, 56 extra = 264
    expect(trailingFits(264, 200, 56, 8)).toBe(true);
    expect(trailingFits(300, 200, 56, 8)).toBe(true);
  });

  it('leaves it out when it would crowd the list', () => {
    expect(trailingFits(263, 200, 56, 8)).toBe(false);
  });

  it('is false when the list alone does not fit', () => {
    expect(trailingFits(150, 200, 20, 8)).toBe(false);
  });
});

describe('focusWouldBeLost', () => {
  const next = (hidden: number, cramped = false) => ({ count: 1, hidden, cramped });

  it('loses a focused "See all" or "Show fewer" button when nothing is hidden any more', () => {
    expect(focusWouldBeLost('toggle', { open: true, cramped: false }, next(0))).toBe(true);
    expect(focusWouldBeLost('toggle', { open: false, cramped: false }, next(0))).toBe(true);
  });

  it('keeps the button while something is still hidden', () => {
    expect(focusWouldBeLost('toggle', { open: true, cramped: false }, next(2))).toBe(false);
  });

  it('loses a focused scrolling list when it closes by itself', () => {
    expect(focusWouldBeLost('scroller', { open: true, cramped: false }, next(0))).toBe(true);
  });

  it('loses a focused scrolling list when a cramped tile gets room again and the list is closed', () => {
    expect(focusWouldBeLost('scroller', { open: false, cramped: true }, next(0, false))).toBe(true);
  });

  it('keeps a scrolling list that is open with items hidden, or still cramped', () => {
    expect(focusWouldBeLost('scroller', { open: true, cramped: false }, next(2))).toBe(false);
    expect(focusWouldBeLost('scroller', { open: false, cramped: true }, next(0, true))).toBe(false);
  });

  it('never loses anything else', () => {
    expect(focusWouldBeLost('other', { open: true, cramped: true }, next(0))).toBe(false);
  });
});

describe('contentOverflows', () => {
  const never = () => {
    throw new Error('the end of the content should not have been looked up');
  };

  it('is false, without looking at the content, when everything fits with a pixel of rounding to spare', () => {
    expect(contentOverflows(300, 300, 20, never)).toBe(false);
    expect(contentOverflows(301, 300, 20, never)).toBe(false);
  });

  it('is true, without looking at the content, when it is past the box even without its padding', () => {
    expect(contentOverflows(381, 358, 20, never)).toBe(true);
    expect(contentOverflows(500, 358, 0, never)).toBe(true);
  });

  it('does not count the padding at the bottom: a tile whose content ends just inside it stays a plain box', () => {
    // 369 = the content, ending at 349, plus 20px of bottom padding, in a 358px box
    expect(contentOverflows(369, 358, 20, () => 349)).toBe(false);
  });

  it('still finds content that overflows by less than the padding, when it ends past the box', () => {
    // A list that is taller than the box around it reaches 563 in a 530px box with 40px of padding: 33px is out of reach
    expect(contentOverflows(563, 530, 40, () => 563)).toBe(true);
  });
});
