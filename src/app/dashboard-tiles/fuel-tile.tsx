// Fuel and recovery notes, with the nutrition disclaimer always in view. Notes that do not fit the
// tile sit behind "See all". The note count is the tile's figure; in a small tile it moves up beside the
// title, where it costs no height.
import { Check } from '@phosphor-icons/react';
import { FUEL_DISCLAIMER, type FuelNote } from '@shared/recommendations';
import type { WidgetSize } from '@/lib/widget-layout';
import { TILE_TITLES } from '../dashboard-order';
import { cn } from '@/lib/utils';
import { FitList } from './fit-list';
import { BIG_NUMBER, TileShell } from './tile-shell';

function Note({ note }: { note: FuelNote }) {
  return (
    <div>
      <p className="text-small font-semibold text-ink">{note.title}</p>
      <p className="mt-1 text-label text-ink-2 @[340px]:text-small">{note.text}</p>
      <p className="mt-1 text-caption text-ink-3">Source: {note.citation}</p>
    </div>
  );
}

/** The three things that produce a note (fuelNotes in shared/recommendations.ts), by note id. */
const TRIGGERS: Record<FuelNote['id'], string> = { HIGH_LOAD: 'Heavy week', POOR_RECOVERY: 'Low recovery', POST_SESSION: 'After a hard session' };

/** Which of those the player has right now. A tall tile has room to show them. */
function Triggers({ notes }: { notes: readonly FuelNote[] }) {
  const active = new Set(notes.map((n) => n.id));
  return (
    <ul aria-hidden className="flex flex-wrap gap-1.5">
      {(Object.keys(TRIGGERS) as FuelNote['id'][]).map((id) => (
        <li
          key={id}
          className={cn(
            'inline-flex items-center gap-1 rounded-[var(--radius-chip)] px-2.5 py-0.5 text-caption',
            active.has(id) ? 'bg-accent-soft font-semibold text-accent-ink' : 'bg-sunken text-ink-2',
          )}
        >
          {active.has(id) && <Check weight="bold" className="size-3" />}
          {TRIGGERS[id]}
        </li>
      ))}
    </ul>
  );
}

const DISCLAIMER = <p className="rounded-[var(--radius-control)] bg-sunken px-3 py-2.5 text-caption leading-snug text-ink-2">{FUEL_DISCLAIMER}</p>;

export function FuelTile({ notes, size }: { notes: readonly FuelNote[]; size: WidgetSize }) {
  const unit = notes.length === 1 ? 'note' : 'notes';
  const bigFigure = size === 'tall';
  return (
    <TileShell
      title={TILE_TITLES.fuel}
      titleId="fuel-title"
      meta={bigFigure ? undefined : <span className="tnum text-label text-ink-2">{notes.length} {unit}</span>}
    >
      {bigFigure && (
        <p className="flex items-baseline gap-2">
          <span className={BIG_NUMBER}>{notes.length}</span>
          <span className="text-label text-ink-2">{unit}</span>
        </p>
      )}
      {notes.length > 0 ? (
        <FitList
          items={notes}
          keyOf={(n) => n.id}
          renderItem={(note) => <Note note={note} />}
          noun="notes"
          scrollLabel="All fuel notes, scrollable"
          listClassName="flex flex-col gap-4"
          footer={DISCLAIMER}
        />
      ) : (
        <>
          <p className="flex-1 text-small text-ink-2">Nothing to flag right now. Notes appear after a heavy week, when recovery is low, or after a hard session.</p>
          {DISCLAIMER}
        </>
      )}
      {bigFigure && <Triggers notes={notes} />}
    </TileShell>
  );
}
