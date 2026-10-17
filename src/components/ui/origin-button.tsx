// Origin button: the 21st.dev "OriginButton" (the owner's pick) on PitchSafe tokens. A circle grows
// from the pointer and floods the button; from the centre on keyboard focus or key press. Colours,
// shape and size come from Button (button.tsx), which passes them in; this file is the behaviour.
//
// Differences from the 21st source, on purpose:
// - tokens only (no --ic-* theme class); the global :focus-visible outline replaces its focus ring;
// - hover fills only where the device can hover (touch fills on press);
// - prefers-reduced-motion, read live (a mounted button follows an OS change): the fill fades in 120ms
//   instead of growing, and no press scale;
// - aria-disabled counts as disabled (no fill, no press scale), because the My drills page uses it;
//   a busy button that must keep keyboard focus uses aria-disabled with aria-busy (both pass through), not `loading`, which disables it;
// - asChild (Radix Slot) so a Link can be the button; and `type` is not defaulted, because the old
//   Button never set one and forms with an untyped submit button must keep submitting;
// - Space is not cancelled on keydown (the native button activates on keyup and needs it);
// - sizes use layout pixels, not the on-screen rect, which shrinks while the button is pressed.
import * as React from 'react';
import { motion } from 'motion/react';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';
import { getCoverDiameter, hasAccessibleName, isAriaDisabled, toLocalPoint } from '@/lib/origin-button-helpers';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';

const FILL_TRANSITION = { duration: 0.5, ease: [0.16, 1, 0.3, 1] } as const;
const REDUCED_FILL_TRANSITION = { duration: 0.12, ease: 'linear' } as const;
const PRESS_SCALE = 0.98;
const PRESS_TRANSITION = { duration: 0.14, ease: [0.23, 1, 0.32, 1] } as const;
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

/** Motion types these handlers differently from React, so a button cannot take them. */
type MotionClashes =
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onAnimationStart'
  | 'onDrag'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragExit'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDragStart'
  | 'onDrop';

export interface OriginButtonProps extends Omit<React.ComponentProps<'button'>, MotionClashes> {
  /** Render the single child element (a Link) as the button, keeping the fill and the label wrapper. */
  asChild?: boolean;
  /** Busy: disabled, no fill, aria-busy. */
  loading?: boolean;
  /** Background of the growing circle, as a Tailwind `bg-*` class. */
  fillClassName: string;
  /** Classes that win while the fill shows: the text (and border) colour that reads over it. */
  filledClassName?: string;
}

// Motion wraps Slot so an asChild link gets the press scale too
const MotionSlot = motion.create(Slot.Root);

const canHover = () => typeof window !== 'undefined' && window.matchMedia(HOVER_QUERY).matches;

function matches(node: Element, selector: string) {
  try {
    return node.matches(selector);
  } catch {
    return false; // a browser that does not know the pseudo-class
  }
}

const isFocusVisible = (node: Element) => matches(node, ':focus-visible');
const isPointerOver = (node: Element) => canHover() && matches(node, ':hover');

/** Layout size (unaffected by the press scale) next to the on-screen rect. */
function measure(node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  return { rect, layout: { width: node.offsetWidth || rect.width, height: node.offsetHeight || rect.height } };
}

const renderLabel = (content: React.ReactNode) => <span className="relative z-10 inline-flex items-center justify-center gap-2">{content}</span>;

function OriginButton({
  asChild = false,
  children,
  className,
  disabled = false,
  loading = false,
  fillClassName,
  filledClassName,
  onBlur,
  onClick,
  onFocus,
  onKeyDown,
  onKeyUp,
  onPointerCancel,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onPointerUp,
  ref,
  type,
  ...props
}: OriginButtonProps) {
  const nodeRef = React.useRef<HTMLElement | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  const isInert = Boolean(disabled || loading);
  const isDisabled = isInert || isAriaDisabled(props['aria-disabled']);
  const [hovered, setHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);
  const [origin, setOrigin] = React.useState({ x: 0, y: 0 });
  const [coverSize, setCoverSize] = React.useState(0);

  const ariaLabel = props['aria-label'];
  const ariaLabelledBy = props['aria-labelledby'];
  const warned = React.useRef(false);

  React.useEffect(() => {
    if (!import.meta.env.DEV || warned.current) return;
    if (hasAccessibleName({ children, asChild, ariaLabel, ariaLabelledBy })) return;
    warned.current = true;
    console.warn('OriginButton: provide visible label text or aria-label / aria-labelledby so the control has an accessible name.');
  }, [asChild, ariaLabel, ariaLabelledBy, children]);

  // A button that turns disabled or busy while the pointer is over it never gets its leave event
  React.useEffect(() => {
    if (!isDisabled) return;
    setHovered(false);
    setIsPressed(false);
  }, [isDisabled]);

  const updateOrigin = React.useCallback((x: number, y: number) => {
    const node = nodeRef.current;
    if (!node) return;
    const { layout } = measure(node);
    setOrigin({ x, y });
    setCoverSize(getCoverDiameter(layout.width, layout.height, x, y));
  }, []);

  const updateOriginFromPointer = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const { rect, layout } = measure(event.currentTarget);
      const point = toLocalPoint(event.clientX, event.clientY, rect, layout);
      updateOrigin(point.x, point.y);
    },
    [updateOrigin],
  );

  const updateOriginFromCenter = React.useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    const { layout } = measure(node);
    updateOrigin(layout.width / 2, layout.height / 2);
  }, [updateOrigin]);

  const showFill = !isDisabled && (hovered || isPressed);

  // Re-measure while the fill shows: the button can resize (a label swap, a web font arriving)
  React.useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!(node && showFill)) return;
    let active = true;
    const remeasure = () => {
      if (!active) return;
      const { layout } = measure(node);
      setCoverSize(getCoverDiameter(layout.width, layout.height, origin.x, origin.y));
    };
    remeasure();
    const observer = new ResizeObserver(remeasure);
    observer.observe(node);
    document.fonts?.ready.then(remeasure).catch(() => undefined);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [showFill, origin.x, origin.y]);

  // Our node ref and the caller's, with React 19 cleanup semantics
  const setRefs = React.useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      const element = node as HTMLButtonElement | null;
      let release: (() => void) | undefined;
      if (typeof ref === 'function') {
        const cleanup = ref(element);
        release = typeof cleanup === 'function' ? cleanup : () => ref(null);
      } else if (ref) {
        ref.current = element;
        release = () => {
          ref.current = null;
        };
      }
      return () => {
        nodeRef.current = null;
        release?.();
      };
    },
    [ref],
  );

  const covering = showFill && coverSize > 0;
  const Root = (asChild ? MotionSlot : motion.button) as typeof motion.button;

  return (
    <Root
      {...props}
      aria-busy={loading || props['aria-busy'] || undefined}
      aria-disabled={asChild && isInert ? true : props['aria-disabled']}
      className={cn(
        'relative isolate cursor-pointer touch-manipulation select-none overflow-hidden',
        // The label colour changes over the same 500ms and curve as the fill (FILL_TRANSITION), so it never flips before the fill arrives
        'transition-[color,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:duration-100',
        asChild && isInert && 'pointer-events-none',
        className,
        showFill && filledClassName,
      )}
      data-filled={showFill ? 'true' : undefined}
      data-pressed={isPressed ? 'true' : 'false'}
      disabled={asChild ? undefined : isInert}
      onBlur={(event) => {
        onBlur?.(event);
        setIsPressed(false);
        if (!event.defaultPrevented) setHovered(isPointerOver(event.currentTarget));
      }}
      onClick={onClick}
      onFocus={(event) => {
        onFocus?.(event);
        if (isDisabled || event.defaultPrevented) return;
        if (isFocusVisible(event.currentTarget)) {
          updateOriginFromCenter();
          setHovered(true);
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || isDisabled || event.repeat) return;
        const isSpace = event.key === ' ';
        if (event.key !== 'Enter' && !isSpace) return;
        // a link activates on Enter only; Space scrolls the page
        if (isSpace && event.currentTarget.tagName !== 'BUTTON') return;
        updateOriginFromCenter();
        setIsPressed(true);
        setHovered(true);
      }}
      onKeyUp={(event) => {
        onKeyUp?.(event);
        if (event.key === ' ' || event.key === 'Enter') {
          setIsPressed(false);
          setHovered(isFocusVisible(event.currentTarget) || isPointerOver(event.currentTarget));
        }
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        setIsPressed(false);
        setHovered(isFocusVisible(event.currentTarget));
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.defaultPrevented || isDisabled || event.button !== 0) return;
        updateOriginFromPointer(event);
        setIsPressed(true);
        setHovered(true);
      }}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (isDisabled || event.defaultPrevented || !canHover()) return;
        updateOriginFromPointer(event);
        setHovered(true);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        setHovered(isFocusVisible(event.currentTarget));
        setIsPressed(false);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        setIsPressed(false);
        // a finger lifted off a touch screen is not hovering, and may not get a leave event
        if (event.pointerType === 'touch') setHovered(isFocusVisible(event.currentTarget));
      }}
      ref={setRefs}
      tabIndex={asChild && isInert ? -1 : props.tabIndex}
      transition={PRESS_TRANSITION}
      type={asChild ? undefined : type}
      whileTap={isDisabled || reduceMotion ? undefined : { scale: PRESS_SCALE }}
    >
      <motion.span
        animate={reduceMotion ? { opacity: covering ? 1 : 0, scale: 1 } : { opacity: 1, scale: covering ? 1 : 0 }}
        aria-hidden
        className={cn('pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full', fillClassName)}
        initial={false}
        style={{ height: coverSize, left: origin.x, top: origin.y, width: coverSize }}
        transition={reduceMotion ? REDUCED_FILL_TRANSITION : FILL_TRANSITION}
      />
      {asChild ? <Slot.Slottable child={children}>{renderLabel}</Slot.Slottable> : renderLabel(children)}
    </Root>
  );
}

export { OriginButton };
