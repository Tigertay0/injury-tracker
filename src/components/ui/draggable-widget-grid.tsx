// Adapted from the 21st.dev "Draggable Widget Grid" (owner supplied, 2026-10-17).
// The pure layout code lives in src/lib/widget-layout.ts; this file is the component.
//
// A grid of widgets that can be rearranged by dragging. The layout is a sequence plus a size
// per widget; an exact tiler turns the sequence into a gap-free rectangle at any column count,
// and Motion animates every change.
//
// - Mouse and pen drag immediately. Touch uses a long press, so the page can still be scrolled.
// - Keyboard: focus a widget, hold Alt and use the arrow keys.
// - Every widget also has two buttons, "Move earlier" and "Move later", for anyone who cannot drag
//   (WCAG 2.5.7), and who may have no Alt key either (a screen reader on a phone).
// - With `editable` off there is no drag, no moves, and links inside widgets work.
// - Styling uses PitchSafe tokens, so it follows the light and dark themes.
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { MotionConfig, motion, useDragControls } from 'motion/react';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';
import {
  candidatesFor,
  canonical,
  choose,
  layout,
  reconcileItems,
  sameOrder,
  sizeOf,
  stepMove,
  type Box,
  type Slot,
  type WidgetItem,
  type WidgetSize,
} from '@/lib/widget-layout';

export type { WidgetItem, WidgetSize } from '@/lib/widget-layout';

export interface DraggableWidgetGridProps {
  /**
   * The widgets, in order. The grid keeps its own copy while it is being used, so
   * `onChange` is optional. When this prop later holds different widgets than the
   * last one the grid saw (a different set, order, size or label, for example once a
   * saved layout has loaded), the grid adopts it. A prop that changes during a drag is
   * adopted after the drop. A new array with the same contents, or the grid's own
   * `onChange` result passed straight back, changes nothing.
   */
  items: WidgetItem[];
  /** Called after a drop or a move that changed the order, with the id of the widget that was moved. */
  onChange?: (items: WidgetItem[], movedId: string) => void;
  /** Called when a move could not happen because the widget is already first or last (for a status message). */
  onMoveBlocked?: (edge: 'first' | 'last') => void;
  renderItem?: (item: WidgetItem, size: WidgetSize) => ReactNode;
  /** When false there is no drag, links work, and moves are off. */
  editable?: boolean;
  maxColumns?: number;
  cellSize?: number;
  gap?: number;
  /** Any CSS length. Defaults to the panel radius token. */
  radius?: string;
  /** Fade and slide the widgets in when the grid first draws. Turn off when a grid is drawn again on a screen the player is already looking at. */
  animateEntrance?: boolean;
  className?: string;
}

const SIZE_LABELS: { [K in WidgetSize]: string } = {
  sm: 'Small',
  wide: 'Wide',
  tall: 'Tall',
  lg: 'Large',
};

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/* ------------------------------ Motion ------------------------------ */

const SPRING = { type: 'spring', visualDuration: 0.38, bounce: 0.16 } as const;
const LIFT = { type: 'spring', visualDuration: 0.26, bounce: 0.32 } as const;
const LIFT_SCALE = 1.06;
/** Minimum time between two reorders during a drag. */
const SETTLE_MS = 40;
/** How long the drop outline stays visible. */
const LANDED_MS = 620;
/** Touch: hold time before a widget lifts. */
const LONG_PRESS_MS = 350;
/** Touch: movement allowed during the hold before it counts as a scroll. */
const PRESS_SLOP = 8;
/** How long a click after a drag is ignored. */
const SWALLOW_MS = 300;

// The lifted shadow is a CSS transition rather than a Motion value, so it can use the theme
// shadow colour. Both states have two layers, so the shadow interpolates.
const SHADOW_CLASSES =
  'shadow-[0_1px_2px_0_hsl(var(--shadow-color)/0.1),0_0_0_0_hsl(var(--shadow-color)/0)] ' +
  'transition-shadow duration-300 motion-reduce:transition-none ' +
  'data-[lifted=true]:shadow-[0_28px_60px_-16px_hsl(var(--shadow-color)/0.45),0_10px_24px_-8px_hsl(var(--shadow-color)/0.3)]';

// The inner wrapper clips its content (overflow-hidden and a rounded clip-path), which also cuts
// off the global focus outline of a link or button near the tile edge, and a whole-tile link in
// non-editable mode would show no ring at all. So the unclipped outer element draws the ring:
// `focus-visible` covers the tile itself (editable mode, where it takes focus) and
// `has-[:focus-visible]` covers anything inside it. A focused element is either the tile or a
// descendant, never both, and both rules set identical values, so the tile never gets two rings.
const FOCUS_CLASSES =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ' +
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus';

/* ------------------------------ Widget ------------------------------ */

interface Press {
  timer: number;
  pointerId: number;
  x: number;
  y: number;
}

type Phase = 'idle' | 'holding' | 'lifted';

interface WidgetHandlers {
  start: (id: string) => void;
  drag: () => void;
  end: (id: string) => void;
  key: (e: ReactKeyboardEvent, id: string) => void;
  /** A move button was pressed: move the widget, or report that it is already first or last. */
  press: (id: string, delta: -1 | 1) => void;
  /** True while the click that follows a drop should be ignored. */
  swallow: () => boolean;
  /** Ignore the next click (called when a pointer is released after a drag). */
  suppressClick: () => void;
}

interface WidgetProps {
  item: WidgetItem;
  col: number;
  row: number;
  w: number;
  h: number;
  columns: number;
  rows: number;
  editable: boolean;
  held: boolean;
  raised: boolean;
  landed: boolean;
  animateEntrance: boolean;
  handlers: WidgetHandlers;
  hintId: string;
  position: number;
  count: number;
  renderItem?: (item: WidgetItem, size: WidgetSize) => ReactNode;
}

const Widget = memo(function Widget({
  item,
  col,
  row,
  w,
  h,
  columns,
  rows,
  editable,
  held,
  raised,
  landed,
  animateEntrance,
  handlers,
  hintId,
  position,
  count,
  renderItem,
}: WidgetProps) {
  const controls = useDragControls();
  const reduceMotion = usePrefersReducedMotion();
  const node = useRef<HTMLDivElement>(null);
  const press = useRef<Press | null>(null);
  const lifted = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  const release = useCallback(() => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
    lifted.current = false;
    cleanup.current?.();
    cleanup.current = null;
    setPhase('idle');
  }, []);

  // Editing switched off mid-press or mid-lift: put the widget back to rest.
  useEffect(() => {
    if (!editable) release();
  }, [editable, release]);

  useEffect(() => {
    const el = node.current;
    if (!el) return;
    // While lifted, touch movement drags the widget instead of the page.
    const block = (e: TouchEvent) => {
      if (lifted.current) e.preventDefault();
    };
    el.addEventListener('touchmove', block, { passive: false });
    return () => {
      el.removeEventListener('touchmove', block);
      if (press.current) window.clearTimeout(press.current.timer);
      cleanup.current?.();
    };
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!editable || e.button !== 0 || !e.isPrimary) return;
    if (e.pointerType !== 'touch') {
      controls.start(e);
      return;
    }
    if (press.current || lifted.current) return;
    const origin = e.nativeEvent;
    const pointerId = e.pointerId;
    setPhase('holding');
    press.current = {
      pointerId,
      x: e.clientX,
      y: e.clientY,
      timer: window.setTimeout(() => {
        press.current = null;
        lifted.current = true;
        setPhase('lifted');
        navigator.vibrate?.(10);
        controls.start(origin);
        const done = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          handlers.suppressClick();
          release();
        };
        window.addEventListener('pointerup', done);
        window.addEventListener('pointercancel', done);
        cleanup.current = () => {
          window.removeEventListener('pointerup', done);
          window.removeEventListener('pointercancel', done);
        };
      }, LONG_PRESS_MS),
    };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const p = press.current;
    if (p && e.pointerId === p.pointerId && Math.hypot(e.clientX - p.x, e.clientY - p.y) > PRESS_SLOP) release();
  };

  const onPointerEnd = (e: ReactPointerEvent) => {
    if (press.current?.pointerId === e.pointerId) release();
  };

  const delay = (col / Math.max(columns, 1) + row / Math.max(rows, 1)) * 0.26;
  const isLifted = held || phase === 'lifted';
  const name = item.label ?? `${SIZE_LABELS[item.size]} widget`;

  return (
    <motion.div
      ref={node}
      role="listitem"
      data-slot="widget"
      data-widget-id={item.id}
      data-lifted={isLifted}
      tabIndex={editable ? 0 : undefined}
      aria-label={name}
      aria-roledescription={editable ? 'draggable tile' : undefined}
      aria-describedby={editable ? hintId : undefined}
      aria-posinset={position}
      aria-setsize={count}
      layout="position"
      drag={editable}
      dragListener={false}
      dragControls={controls}
      dragSnapToOrigin
      dragMomentum={false}
      onDragStart={() => handlers.start(item.id)}
      onDrag={handlers.drag}
      onDragEnd={() => handlers.end(item.id)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onContextMenu={(e) => {
        if (phase !== 'idle') e.preventDefault();
      }}
      onKeyDown={(e) => handlers.key(e, item.id)}
      onClickCapture={(e) => {
        if (handlers.swallow() || (editable && (e.target as Element).closest('a'))) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      animate={{ scale: phase === 'holding' ? 0.97 : phase === 'lifted' ? LIFT_SCALE : 1 }}
      whileDrag={{ scale: LIFT_SCALE, transition: LIFT }}
      transition={SPRING}
      className={cn(
        'relative min-w-0 rounded-[var(--widget-radius)] [&_a]:[-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none]',
        FOCUS_CLASSES,
        SHADOW_CLASSES,
        editable && 'cursor-grab touch-pan-y touch-pinch-zoom select-none [-webkit-touch-callout:none] active:cursor-grabbing',
      )}
      style={{
        gridColumn: `${col + 1} / span ${w}`,
        gridRow: `${row + 1} / span ${h}`,
        zIndex: held ? 20 : raised ? 10 : 0,
      }}
    >
      <motion.div
        data-widget-surface
        // No entrance animation under prefers-reduced-motion; MotionConfig does not cover opacity.
        initial={reduceMotion || !animateEntrance ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', visualDuration: 0.6, bounce: 0.12, delay }}
        className={cn(
          'relative isolate flex h-full w-full flex-col overflow-hidden rounded-[var(--widget-radius)] bg-surface text-ink ring-inset transition-shadow duration-300 [clip-path:inset(0_round_var(--widget-radius))] motion-reduce:transition-none',
          landed ? 'ring-2 ring-focus' : isLifted ? 'ring-1 ring-line-strong' : 'ring-1 ring-line',
        )}
      >
        {renderItem?.(item, sizeOf(w, h))}
      </motion.div>
      {editable && (
        // Outside the clipped, inert surface so the buttons stay reachable. A press here must not start a drag
        // or the touch long-press, which both begin on the widget's own pointer-down. Pinned to the bottom right,
        // the one corner that holds no tile title or figure, on a translucent scrim (outer radius = button + 4px padding)
        // so the chips and notes it covers fade out behind it instead of being cut by a button edge.
        <div data-widget-moves className="absolute right-1 bottom-1 z-20 flex gap-1 rounded-[calc(var(--radius-control)+4px)] bg-surface/80 p-1" onPointerDown={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={`Move ${name} earlier`}
            aria-disabled={position === 1 || undefined}
            onClick={() => handlers.press(item.id, -1)}
          >
            <ArrowLeft aria-hidden weight="bold" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={`Move ${name} later`}
            aria-disabled={position === count || undefined}
            onClick={() => handlers.press(item.id, 1)}
          >
            <ArrowRight aria-hidden weight="bold" />
          </Button>
        </div>
      )}
    </motion.div>
  );
});

/* ------------------------------- Grid ------------------------------- */

export function DraggableWidgetGrid({
  items: propItems,
  onChange,
  onMoveBlocked,
  renderItem,
  editable = true,
  maxColumns = 4,
  cellSize = 215,
  gap = 12,
  radius = 'var(--radius-panel)',
  animateEntrance = true,
  className,
}: DraggableWidgetGridProps) {
  const [items, setItems] = useState(propItems);
  const grid = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const minColumns = Math.min(2, Math.max(1, maxColumns));

  const [metrics, setMetrics] = useState({ unit: 0, columns: 0 });
  useIsoLayoutEffect(() => {
    const el = grid.current;
    if (!el) return;
    const measure = () => {
      const width = el.getBoundingClientRect().width;
      if (width < 1) return;
      const columns = Math.max(minColumns, Math.min(maxColumns, Math.round(width / cellSize)));
      const unit = (width - gap * (columns - 1)) / columns;
      setMetrics((was) => (was.columns === columns && Math.abs(was.unit - unit) < 0.5 ? was : { unit, columns }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxColumns, minColumns, cellSize, gap]);

  const columns = metrics.columns || Math.max(minColumns, maxColumns);
  const placements = useMemo(() => layout(items, columns), [items, columns]);
  const rows = placements.reduce((n, p) => Math.max(n, p.row + p.h), 0);

  // Latest values for event handlers that outlive a render.
  const latest = useRef({ items, metrics, onChange, onMoveBlocked });
  latest.current.metrics = metrics;
  latest.current.onChange = onChange;
  latest.current.onMoveBlocked = onMoveBlocked;
  useIsoLayoutEffect(() => {
    latest.current.items = items;
  }, [items]);

  const commit = useCallback((next: WidgetItem[]) => {
    latest.current.items = next;
    setItems(next);
  }, []);

  const toSlot = useCallback(
    (box: Box): Slot => {
      const el = grid.current;
      const { unit } = latest.current.metrics;
      const rect = el?.getBoundingClientRect();
      const colStep = unit + gap;
      const rowStep = Math.round(unit) + gap;
      const left = (rect?.left ?? 0) + box.col * colStep;
      const top = (rect?.top ?? 0) + box.row * rowStep;
      return {
        left,
        top,
        right: left + box.w * colStep - gap,
        bottom: top + box.h * rowStep - gap,
      };
    },
    [gap],
  );

  /* Drag state. React only re-renders on lift, reorder and drop. */
  const [held, setHeld] = useState<string | null>(null);
  const [raised, setRaised] = useState<string | null>(null);
  const [landed, setLanded] = useState<string | null>(null);
  const dragging = useRef<string | null>(null);
  const startOrder = useRef<WidgetItem[] | null>(null);
  const frame = useRef(0);
  const lastMove = useRef(0);
  const swallowUntil = useRef(0);
  const disarmSwallow = useRef<AbortController | null>(null);
  const ring = useRef(0);
  const refocus = useRef<string | null>(null);

  // Adopt a changed `items` prop (see DraggableWidgetGridProps.items). `seen` is the last prop
  // already looked at, so a drop is never undone by a parent that ignores onChange.
  const seen = useRef(propItems);
  useIsoLayoutEffect(() => {
    const next = reconcileItems(latest.current.items, seen.current, propItems, held !== null);
    seen.current = next.seen;
    if (next.items !== latest.current.items) commit(next.items);
  }, [propItems, held, commit]);

  // Editing switched off mid-drag: the drag can end without onDragEnd running, which would leave
  // the widget raised and lifted and block adopting a new `items` prop. Clear that state here. The
  // widget stays where it was dropped, so a changed order is reported as if the drag had ended.
  useIsoLayoutEffect(() => {
    if (editable) return;
    disarmSwallow.current?.abort();
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    window.clearTimeout(ring.current);
    const draggedId = dragging.current;
    const before = startOrder.current;
    dragging.current = null;
    startOrder.current = null;
    setHeld(null);
    setRaised(null);
    setLanded(null);
    const after = latest.current.items;
    if (draggedId && before && !sameOrder(before, after)) latest.current.onChange?.(after, draggedId);
  }, [editable]);

  const step = useCallback(
    (force = false): void => {
      frame.current = 0;
      const id = dragging.current;
      const { items: current, metrics: m } = latest.current;
      const el = id
        ? (grid.current?.querySelector(`[data-widget-id="${CSS.escape(id)}"]`) as HTMLElement | null)
        : null;
      if (!id || !el || !m.columns) return;
      const now = performance.now();
      if (!force && now - lastMove.current < SETTLE_MS) {
        // Try again next frame, so a widget held still still settles.
        frame.current = requestAnimationFrame(() => step());
        return;
      }
      const me = layout(current, m.columns).find((p) => p.id === id);
      if (!me) return;
      const r = el.getBoundingClientRect();
      const order = choose(
        toSlot(me),
        candidatesFor(current, id, m.columns, toSlot),
        r.left + r.width / 2,
        r.top + r.height / 2,
      );
      if (!order) return;
      lastMove.current = now;
      commit(canonical(order, m.columns));
    },
    [toSlot, commit],
  );

  useEffect(
    () => () => {
      disarmSwallow.current?.abort();
      cancelAnimationFrame(frame.current);
      window.clearTimeout(ring.current);
    },
    [],
  );

  // Keep keyboard focus on a widget after it moves in the DOM.
  useIsoLayoutEffect(() => {
    const id = refocus.current;
    if (!id) return;
    refocus.current = null;
    const el = grid.current?.querySelector(`[data-widget-id="${CSS.escape(id)}"]`) as HTMLElement | null;
    el?.focus();
  }, [items]);

  /** Moves a widget one place earlier or later. False when it is already at that end. */
  const move = useCallback(
    (id: string, delta: -1 | 1): boolean => {
      const { items: current, metrics: m } = latest.current;
      const next = stepMove(current, id, delta, m.columns || maxColumns);
      if (!next) return false;
      commit(next);
      latest.current.onChange?.(next, id);
      return true;
    },
    [commit, maxColumns],
  );
  const blocked = useCallback((delta: -1 | 1) => latest.current.onMoveBlocked?.(delta < 0 ? 'first' : 'last'), []);

  const handlers: WidgetHandlers = useMemo(
    () => ({
      start: (id) => {
        dragging.current = id;
        startOrder.current = latest.current.items;
        lastMove.current = 0;
        setHeld(id);
        setRaised(id);
        // The click fired on release must not reach the widget's content.
        // A drag that ends in pointercancel has no click to swallow, and must not leave the listener armed.
        disarmSwallow.current?.abort();
        const armed = new AbortController();
        disarmSwallow.current = armed;
        const options = { once: true, capture: true, signal: armed.signal };
        window.addEventListener(
          'pointerup',
          () => {
            swallowUntil.current = performance.now() + SWALLOW_MS;
            armed.abort();
          },
          options,
        );
        window.addEventListener('pointercancel', () => armed.abort(), options);
      },
      drag: () => {
        if (!frame.current) frame.current = requestAnimationFrame(() => step());
      },
      end: (id) => {
        cancelAnimationFrame(frame.current);
        step(true);
        frame.current = 0;
        dragging.current = null;
        setHeld(null);
        setLanded(id);
        window.clearTimeout(ring.current);
        ring.current = window.setTimeout(() => {
          setLanded(null);
          setRaised(null);
        }, LANDED_MS);
        const before = startOrder.current;
        startOrder.current = null;
        const after = latest.current.items;
        if (before && !sameOrder(before, after)) latest.current.onChange?.(after, id);
      },
      key: (e, id) => {
        if (!editable || !e.altKey) return;
        if ((e.target as HTMLElement).closest('input, textarea, select')) return;
        const delta =
          e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!delta) return;
        e.preventDefault();
        // After a keyboard move, focus goes back to the tile
        if (move(id, delta)) refocus.current = id;
        else blocked(delta);
      },
      press: (id, delta) => {
        // A button keeps focus where it is: the tile does not move in the DOM, so there is nothing to refocus
        if (!move(id, delta)) blocked(delta);
      },
      swallow: () => performance.now() < swallowUntil.current,
      suppressClick: () => {
        swallowUntil.current = performance.now() + SWALLOW_MS;
      },
    }),
    [step, commit, move, blocked, editable],
  );

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  /*
   * DOM order stays fixed; only grid placement changes. Moving elements in
   * the DOM restarts Motion's mount animation in some React versions, which
   * made rearranged widgets fade out and back in. The visual position is
   * exposed through aria-posinset instead.
   */
  const domOrder = useRef(items.map((item) => item.id));
  for (const item of items) if (!domOrder.current.includes(item.id)) domOrder.current.push(item.id);
  const placementById = new Map(placements.map((p) => [p.id, p]));
  const visualIndex = new Map(
    [...placements].sort((a, b) => a.row - b.row || a.col - b.col).map((p, i) => [p.id, i]),
  );

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn('relative w-full', className)}
        style={{ '--widget-radius': radius } as CSSProperties}
      >
        {editable && (
          <p id={hintId} className="sr-only">
            Drag to rearrange, or use the move buttons. On touch screens, press and hold first. With a keyboard, hold
            Alt and press the arrow keys.
          </p>
        )}
        <div
          ref={grid}
          role="list"
          data-slot="widget-grid"
          className="grid w-full"
          style={{
            gap,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            // Square cells: row height equals column width.
            gridAutoRows: metrics.unit ? `${Math.round(metrics.unit)}px` : `minmax(${cellSize * 0.75}px, auto)`,
          }}
        >
          {domOrder.current.map((id) => {
            const item = byId.get(id);
            const p = placementById.get(id);
            if (!item || !p) return null;
            return (
              <Widget
                key={id}
                position={(visualIndex.get(id) ?? 0) + 1}
                count={placements.length}
                item={item}
                col={p.col}
                row={p.row}
                w={p.w}
                h={p.h}
                columns={columns}
                rows={rows}
                editable={editable}
                held={held === p.id}
                raised={raised === p.id}
                landed={landed === p.id}
                animateEntrance={animateEntrance}
                handlers={handlers}
                hintId={hintId}
                renderItem={renderItem}
              />
            );
          })}
        </div>
      </div>
    </MotionConfig>
  );
}

export default DraggableWidgetGrid;
