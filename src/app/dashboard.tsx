// Dashboard: a grid of tiles in the style of the 21st.dev draggable widget grid. The injury risk score
// comes first with the four inputs behind it, then the load chart, movement, advice and fuel notes.
// The player can rearrange the tiles, and the order is saved to their account.
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ArrowsOutCardinal, Check, Plus } from '@phosphor-icons/react';
import { buildRiskModel } from '@shared/risk-model';
import { Button } from '@/components/ui/button';
import { DraggableWidgetGrid } from '@/components/ui/draggable-widget-grid';
import { useAppBase, useOverview, usePlayerData } from '@/lib/player-data';
import { useLocalToday } from '@/lib/use-local-today';
import type { WidgetItem, WidgetSize } from '@/lib/widget-layout';
import { ActionsTile } from './dashboard-tiles/actions-tile';
import { FuelTile } from './dashboard-tiles/fuel-tile';
import { LoadTile } from './dashboard-tiles/load-tile';
import { EquipmentTile, InjuryTile, RecoveryTile, WorkloadTile } from './dashboard-tiles/part-tiles';
import { ReportTile } from './dashboard-tiles/report-tile';
import { ScoreTile, scoreTitle } from './dashboard-tiles/score-tile';
import { MovementTile } from './movement-panel';
import { TILE_TITLES, tileItems, type TileId } from './dashboard-order';
import { PageHeader } from './page-header';
import { useTileMode } from './use-tile-mode';
import { useTileOrder } from './use-tile-order';

export const DISCLAIMER =
  'PitchSafe is an educational awareness tool, not a medical device or diagnostic service. Risk scores come from self-reported data and published sports science models. They are indicators, not guarantees, and individual risk depends on things this tool cannot measure. If you feel pain or think you are injured, stop training and see a qualified medical professional or physiotherapist.';

/** The tiles lay out on a square grid: about 230px cells up to four columns, or two columns on a phone. */
const DESKTOP_CELL = 230;
const PHONE_CELL = 400;
const GRID_GAP = 12;
const MAX_COLUMNS = 4;

export default function Dashboard() {
  const overview = useOverview();
  const { actions } = usePlayerData();
  const base = useAppBase();
  const today = useLocalToday();
  const model = useMemo(() => buildRiskModel(overview, today), [overview, today]);
  const hasSessions = overview.sessions.length > 0;
  const name = overview.profile?.displayName;
  const mode = useTileMode();

  const titles = useMemo<Record<TileId, string>>(() => ({ score: scoreTitle(model, hasSessions), ...TILE_TITLES }), [model, hasSessions]);

  // Arranging is a mode of its own, because while tiles can be dragged their links cannot be followed.
  const [arranging, setArranging] = useState(false);
  const arrangingNow = useRef(arranging);
  arrangingNow.current = arranging;
  // The grid keeps its tab order from when it was drawn. After tiles moved, drawing it again makes the tab
  // order match what the player now sees: on Done, or at once when a refused save puts the old order back.
  const [gridKey, setGridKey] = useState(0);
  const moved = useRef(false);
  const hintId = useId();

  const { order, change, flush, announcement, clearAnnouncement } = useTileOrder({
    saved: overview.profile?.dashboardOrder ?? [],
    save: actions.saveDashboardOrder,
    labelOf: (id) => titles[id as TileId] ?? id,
    onReverted: () => {
      // Mid-edit the grid takes the order in place and Done redraws it; otherwise redraw it now
      if (arrangingNow.current) moved.current = true;
      else setGridKey((key) => key + 1);
    },
  });
  const items = useMemo(() => tileItems(order, mode, titles), [order, mode, titles]);

  const toggleArranging = () => {
    if (!arranging) {
      setArranging(true);
      return;
    }
    setArranging(false);
    clearAnnouncement();
    if (moved.current) {
      moved.current = false;
      setGridKey((key) => key + 1);
    }
    flush();
  };

  const onChange = useCallback(
    (next: WidgetItem[]) => {
      moved.current = true;
      change(next.map((item) => item.id));
    },
    [change],
  );

  const tileContent = useCallback(
    (item: WidgetItem, size: WidgetSize) => {
      switch (item.id as TileId) {
        case 'score':
          return <ScoreTile model={model} hasSessions={hasSessions} />;
        case 'workload':
          return <WorkloadTile model={model} size={size} />;
        case 'recovery':
          return <RecoveryTile model={model} size={size} />;
        case 'equipment':
          return <EquipmentTile model={model} size={size} />;
        case 'injury':
          return <InjuryTile model={model} size={size} />;
        case 'load':
          return <LoadTile model={model} size={size} compact={mode === 'compact'} />;
        case 'movement':
          return <MovementTile movement={model.movement} />;
        case 'actions':
          return <ActionsTile recommendations={model.recommendations} />;
        case 'fuel':
          return <FuelTile notes={model.fuel} size={size} />;
        case 'report':
          return <ReportTile model={model} />;
        default:
          return null;
      }
    },
    [model, hasSessions, mode],
  );
  // While arranging, a tile is something to move, not a control: its links and buttons stop reacting and
  // keyboard focus lands on the tiles alone.
  const renderTile = useCallback(
    (item: WidgetItem, size: WidgetSize) => (
      <div inert={arranging} className="flex min-h-0 flex-1 flex-col">
        {tileContent(item, size)}
      </div>
    ),
    [tileContent, arranging],
  );

  return (
    <>
      <PageHeader
        title={name ? `Hi ${name}` : 'Your risk today'}
        description={new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={toggleArranging} aria-describedby={arranging ? hintId : undefined}>
              {arranging ? <Check aria-hidden weight="bold" /> : <ArrowsOutCardinal aria-hidden />}
              {arranging ? 'Done' : 'Arrange tiles'}
            </Button>
            <Button asChild className="hidden lg:inline-flex">
              <Link to={`${base}/log`}>
                <Plus aria-hidden weight="bold" />
                Log session
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        {arranging && (
          <p id={hintId} className="rounded-[var(--radius-control)] bg-accent-soft px-4 py-3 text-small text-ink">
            Drag tiles to rearrange. On touch, press and hold first. Keyboard: Alt and arrow keys.
          </p>
        )}
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>

        <DraggableWidgetGrid
          key={gridKey}
          items={items}
          onChange={onChange}
          renderItem={renderTile}
          editable={arranging}
          animateEntrance={gridKey === 0}
          maxColumns={MAX_COLUMNS}
          cellSize={mode === 'desktop' ? DESKTOP_CELL : PHONE_CELL}
          gap={GRID_GAP}
        />

        <p className="text-label text-ink-3">{DISCLAIMER}</p>
        <Link to="/science" className="-mt-3 inline-flex items-center gap-1 self-start text-label font-semibold text-accent-ink underline-offset-2 hover:underline">
          How the score is calculated
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </>
  );
}
