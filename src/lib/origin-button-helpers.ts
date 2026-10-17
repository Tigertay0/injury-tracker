// Pure helpers for the origin button (src/components/ui/origin-button.tsx). They live in a .ts
// file so the unit tests can import them without a JSX or DOM setup.
import { isValidElement, type ReactNode } from 'react';

/**
 * Diameter of the smallest circle centred on (x, y), in the button's own coordinates, that
 * covers a width by height box: twice the distance to the farthest corner, rounded up so
 * anti-aliasing never leaves a hairline at the corner.
 */
export function getCoverDiameter(width: number, height: number, x: number, y: number): number {
  return Math.ceil(
    2 * Math.max(Math.hypot(x, y), Math.hypot(width - x, y), Math.hypot(x, height - y), Math.hypot(width - x, height - y)),
  );
}

interface ClientRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface LayoutSize {
  width: number;
  height: number;
}

/**
 * A pointer position on screen, as a point in the button's own (untransformed) coordinates.
 * The on-screen rect shrinks while the button is pressed (it scales to 0.98), but the fill is
 * positioned and sized in layout pixels, so the position is scaled back by layout / on-screen.
 */
export function toLocalPoint(clientX: number, clientY: number, rect: ClientRect, layout: LayoutSize): { x: number; y: number } {
  const scaleX = rect.width > 0 ? layout.width / rect.width : 1;
  const scaleY = rect.height > 0 ? layout.height / rect.height : 1;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

/** True when a node has visible text, which is what gives a button its accessible name. */
export function hasTextContent(node: ReactNode): boolean {
  if (typeof node === 'string' || typeof node === 'number') return String(node).trim().length > 0;
  if (Array.isArray(node)) return node.some(hasTextContent);
  if (isValidElement<{ children?: ReactNode }>(node)) return hasTextContent(node.props.children);
  return false;
}

interface NameSources {
  children: ReactNode;
  /** The button renders its single child element (a link) as the control. */
  asChild: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

const isFilled = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

/**
 * Whether the control will have an accessible name: visible text, or aria-label or aria-labelledby.
 * With asChild the control is the child element, so a name given on that child counts too.
 */
export function hasAccessibleName({ children, asChild, ariaLabel, ariaLabelledBy }: NameSources): boolean {
  if (isFilled(ariaLabel) || isFilled(ariaLabelledBy) || hasTextContent(children)) return true;
  if (!asChild || !isValidElement<Record<string, unknown>>(children)) return false;
  return isFilled(children.props['aria-label']) || isFilled(children.props['aria-labelledby']);
}

/** aria-disabled arrives as true, 'true', false, 'false' or undefined; only the first two disable. */
export function isAriaDisabled(value: unknown): boolean {
  return value === true || value === 'true';
}
