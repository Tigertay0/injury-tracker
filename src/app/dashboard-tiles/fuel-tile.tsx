// Fuel and recovery notes, with the nutrition disclaimer always in view. Notes that do not fit the
// tile sit behind "See all".
import { FUEL_DISCLAIMER, type FuelNote } from '@shared/recommendations';
import { TILE_TITLES } from '../dashboard-order';
import { FitList } from './fit-list';
import { TileShell } from './tile-shell';

function Note({ note }: { note: FuelNote }) {
  return (
    <div>
      <p className="text-small font-semibold text-ink">{note.title}</p>
      <p className="mt-1 text-label text-ink-2 @[340px]:text-small">{note.text}</p>
      <p className="mt-1 text-caption text-ink-3">Source: {note.citation}</p>
    </div>
  );
}

const DISCLAIMER = <p className="rounded-[var(--radius-control)] bg-sunken px-3 py-2.5 text-caption leading-snug text-ink-2">{FUEL_DISCLAIMER}</p>;

export function FuelTile({ notes }: { notes: readonly FuelNote[] }) {
  return (
    <TileShell title={TILE_TITLES.fuel} titleId="fuel-title">
      {notes.length > 0 ? (
        <FitList items={notes} keyOf={(n) => n.id} renderItem={(note) => <Note note={note} />} noun="notes" listClassName="flex flex-col gap-4" footer={DISCLAIMER} />
      ) : (
        <>
          <p className="flex-1 text-small text-ink-2">Nothing to flag right now. Notes appear after a heavy week, when recovery is low, or after a hard session.</p>
          {DISCLAIMER}
        </>
      )}
    </TileShell>
  );
}
