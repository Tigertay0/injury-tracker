import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { getCoverDiameter, hasTextContent, isAriaDisabled, toLocalPoint } from '@/lib/origin-button-helpers';

const W = 160;
const H = 44;

/** The circle reaches every corner when its radius is at least the distance to that corner. */
function covers(diameter: number, x: number, y: number, width = W, height = H) {
  const corners: Array<[number, number]> = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ];
  return corners.every(([cx, cy]) => Math.hypot(cx - x, cy - y) <= diameter / 2);
}

describe('getCoverDiameter', () => {
  it('from the top-left corner reaches the opposite corner', () => {
    expect(getCoverDiameter(W, H, 0, 0)).toBe(Math.ceil(2 * Math.hypot(W, H)));
  });

  it('from each of the four corners is the same diameter', () => {
    const d = getCoverDiameter(W, H, 0, 0);
    expect(getCoverDiameter(W, H, W, 0)).toBe(d);
    expect(getCoverDiameter(W, H, 0, H)).toBe(d);
    expect(getCoverDiameter(W, H, W, H)).toBe(d);
  });

  it('from the centre is the box diagonal', () => {
    expect(getCoverDiameter(W, H, W / 2, H / 2)).toBe(Math.ceil(Math.hypot(W, H)));
  });

  it('from an edge midpoint reaches the far corners', () => {
    // left edge: the far corners are the two on the right
    expect(getCoverDiameter(W, H, 0, H / 2)).toBe(Math.ceil(2 * Math.hypot(W, H / 2)));
    // top edge
    expect(getCoverDiameter(W, H, W / 2, 0)).toBe(Math.ceil(2 * Math.hypot(W / 2, H)));
  });

  it('is largest in the corners and smallest in the centre', () => {
    const centre = getCoverDiameter(W, H, W / 2, H / 2);
    const corner = getCoverDiameter(W, H, 0, 0);
    const edge = getCoverDiameter(W, H, W / 2, 0);
    expect(centre).toBeLessThan(edge);
    expect(edge).toBeLessThan(corner);
  });

  it('always covers the farthest corner, wherever the pointer lands', () => {
    for (let x = 0; x <= W; x += 8) {
      for (let y = 0; y <= H; y += 4) {
        expect(covers(getCoverDiameter(W, H, x, y), x, y)).toBe(true);
      }
    }
  });

  it('rounds up to a whole pixel', () => {
    const d = getCoverDiameter(101, 37, 13.5, 9.25);
    expect(Number.isInteger(d)).toBe(true);
    expect(covers(d, 13.5, 9.25, 101, 37)).toBe(true);
  });

  it('never returns less than the exact diameter', () => {
    const exact = 2 * Math.hypot(W - 30, H - 10);
    expect(getCoverDiameter(W, H, 30, 10)).toBeGreaterThanOrEqual(exact);
    expect(getCoverDiameter(W, H, 30, 10)).toBeLessThan(exact + 1);
  });

  it('handles a pointer just outside the box and a zero-size box', () => {
    expect(covers(getCoverDiameter(W, H, -3, H + 2), -3, H + 2)).toBe(true);
    expect(getCoverDiameter(0, 0, 0, 0)).toBe(0);
  });

  it('covers a square icon button', () => {
    const d = getCoverDiameter(44, 44, 22, 22);
    expect(d).toBe(Math.ceil(Math.hypot(44, 44)));
    expect(covers(d, 22, 22, 44, 44)).toBe(true);
  });
});

describe('toLocalPoint', () => {
  const rest = { left: 100, top: 50, width: 160, height: 44 };

  it('is a plain offset when the button is not scaled', () => {
    expect(toLocalPoint(130, 60, rest, { width: 160, height: 44 })).toEqual({ x: 30, y: 10 });
  });

  it('maps the on-screen corners to the layout corners while the button is scaled down', () => {
    // pressed: scale 0.98 about the centre, so the on-screen rect is a little smaller
    const pressed = { left: 101.6, top: 50.44, width: 156.8, height: 43.12 };
    const layout = { width: 160, height: 44 };
    const topLeft = toLocalPoint(pressed.left, pressed.top, pressed, layout);
    const bottomRight = toLocalPoint(pressed.left + pressed.width, pressed.top + pressed.height, pressed, layout);
    expect(topLeft.x).toBeCloseTo(0);
    expect(topLeft.y).toBeCloseTo(0);
    expect(bottomRight.x).toBeCloseTo(160);
    expect(bottomRight.y).toBeCloseTo(44);
  });

  it('keeps the cover circle over the farthest corner when pressed', () => {
    const pressed = { left: 101.6, top: 50.44, width: 156.8, height: 43.12 };
    const layout = { width: 160, height: 44 };
    const p = toLocalPoint(pressed.left + pressed.width, pressed.top, pressed, layout);
    expect(covers(getCoverDiameter(layout.width, layout.height, p.x, p.y), p.x, p.y)).toBe(true);
  });

  it('does not divide by a zero-size rect', () => {
    expect(toLocalPoint(10, 10, { left: 0, top: 0, width: 0, height: 0 }, { width: 0, height: 0 })).toEqual({ x: 10, y: 10 });
  });
});

describe('hasTextContent', () => {
  it('finds text in strings, numbers, arrays and nested elements', () => {
    expect(hasTextContent('Save')).toBe(true);
    expect(hasTextContent(0)).toBe(true);
    expect(hasTextContent(['', createElement('span', null, 'Go')])).toBe(true);
    expect(hasTextContent(createElement('a', { href: '/' }, createElement('b', null, 'Home')))).toBe(true);
  });

  it('is false for empty, whitespace-only and icon-only content', () => {
    expect(hasTextContent(undefined)).toBe(false);
    expect(hasTextContent(null)).toBe(false);
    expect(hasTextContent(false)).toBe(false);
    expect(hasTextContent('   ')).toBe(false);
    expect(hasTextContent([createElement('svg', { 'aria-hidden': true })])).toBe(false);
  });
});

describe('isAriaDisabled', () => {
  it('is true only for true and "true"', () => {
    expect(isAriaDisabled(true)).toBe(true);
    expect(isAriaDisabled('true')).toBe(true);
    expect(isAriaDisabled(false)).toBe(false);
    expect(isAriaDisabled('false')).toBe(false);
    expect(isAriaDisabled(undefined)).toBe(false);
    expect(isAriaDisabled('')).toBe(false);
  });
});
