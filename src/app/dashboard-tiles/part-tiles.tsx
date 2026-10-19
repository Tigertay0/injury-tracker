// The four parts behind the score: workload ratio, recovery, cleats and injury history. Each tile is
// one link to the screen where the player can change it, with the figure, a mini meter and the
// status in words.
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight } from '@phosphor-icons/react';
import type { RiskModel } from '@shared/risk-model';
import { MOVEMENT_LABEL } from '@shared/movement';
import type { EquipmentRisk } from '@shared/types';
import { RiskChip } from '@/components/risk-chip';
import {
  ACWR_LABEL,
  ACWR_MEANING,
  ACWR_TONE,
  EQUIPMENT_LABEL,
  EQUIPMENT_TONE,
  RECOVERY_LABEL,
  RECOVERY_TONE,
  type Tone,
} from '@/lib/labels';
import { useAppBase, useOverview } from '@/lib/player-data';
import type { WidgetSize } from '@/lib/widget-layout';
import { cn } from '@/lib/utils';
import { TILE_TITLES } from '../dashboard-order';
import { LEVEL_CHIP } from '../movement-panel';
import { FillMeter, RatioMeter, SegmentMeter } from './meters';
import { equipmentNote, injuryNote, recoveryNote } from './part-notes';
import { ScrollRegion } from './scroll-region';
import { BIG_NUMBER, TILE_LABEL, TILE_PADDING } from './tile-shell';

interface PartTileProps {
  to: string;
  label: string;
  value: string;
  tone: Tone;
  status: string;
  meter: ReactNode;
  /** A line under the figure, shown only when the tile is square and big enough to hold it. */
  note?: string;
  size: WidgetSize;
}

function PartTile({ to, label, value, tone, status, meter, note, size }: PartTileProps) {
  const noteId = useId();
  const stretched = size !== 'sm';
  // Only a square tile draws the note, so only that one points at it
  const describedBy = !stretched && note ? noteId : undefined;
  const figure = <span className={cn(BIG_NUMBER, 'min-w-0 break-words')}>{value}</span>;
  const summary = (
    <div className={cn('flex flex-col gap-2', stretched && 'w-1/2 shrink-0')}>
      {meter}
      <RiskChip tone={tone} className="max-w-full self-start">
        {status}
      </RiskChip>
    </div>
  );
  return (
    // The cell is a fixed square, so enlarged text or text spacing can make the link taller than the tile. It scrolls
    // then instead of being cut off (WCAG 1.4.4, 1.4.12). The link is a child of the box, not the box itself, so no
    // control sits inside another. At the normal size nothing overflows and the box is plain.
    // The container is the box around the scroller, not the link inside it: a scrollbar that takes layout width must not change
    // the width that the tile's size queries see.
    <div className="@container flex min-h-0 flex-1 flex-col">
      <ScrollRegion label={`${label}, scrollable`} className="flex flex-1 flex-col">
        <Link
          to={to}
          aria-label={`${label} ${value} ${status}`}
          aria-describedby={describedBy}
          className="group flex flex-1 shrink-0 flex-col transition-colors duration-150 ease-out hover:bg-sunken/60"
        >
          <div className={cn('flex flex-1 flex-col gap-2', TILE_PADDING)}>
            <div className="flex items-start justify-between gap-2">
              {/* Below 200px a label can wrap, so two lines are kept for it and the figures line up across a row. The arrow, which only decorates, goes when the tile is under 9rem wide (144px at the normal size), so enlarged text keeps the room for the label */}
              <span className={cn(TILE_LABEL, !stretched && '@max-[199px]:min-h-[2.7em]')}>{label}</span>
              <ArrowUpRight aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3 @max-[9rem]:hidden transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            {stretched ? (
              <div className="mt-auto flex items-end justify-between gap-4">
                {figure}
                {summary}
              </div>
            ) : (
              <>
                {figure}
                {note && (
                  <span id={noteId} className="hidden text-label text-ink-2 @[236px]:block">
                    {note}
                  </span>
                )}
                <div className="mt-auto">{summary}</div>
              </>
            )}
          </div>
        </Link>
      </ScrollRegion>
    </div>
  );
}

/** The ratio value stays; the chip names the movement spike when that, not the ratio, set the training part of the score. */
export function workloadChip(model: RiskModel): { tone: Tone; status: string } {
  const worst = model.movement.worst;
  const chip = worst ? LEVEL_CHIP[worst.level] : undefined;
  if (model.trainingInput.source === 'movement' && worst && chip) return { tone: chip.tone, status: `${MOVEMENT_LABEL[worst.type]} ${chip.text.toLowerCase()}` };
  return { tone: ACWR_TONE[model.acwrZone], status: ACWR_LABEL[model.acwrZone] };
}

interface PartProps {
  model: RiskModel;
  size: WidgetSize;
}

export function WorkloadTile({ model, size }: PartProps) {
  const base = useAppBase();
  const { tone, status } = workloadChip(model);
  return (
    <PartTile
      to={`${base}/log`}
      label={TILE_TITLES.workload}
      value={model.acwr === null ? 'N/A' : model.acwr.toFixed(2)}
      tone={tone}
      status={status}
      meter={<RatioMeter ratio={model.acwr} tone={tone} />}
      note={ACWR_MEANING[model.acwrZone]}
      size={size}
    />
  );
}

export function RecoveryTile({ model, size }: PartProps) {
  const base = useAppBase();
  const tone = model.recoveryZone ? RECOVERY_TONE[model.recoveryZone] : 'neutral';
  return (
    <PartTile
      to={`${base}/recovery`}
      label={TILE_TITLES.recovery}
      value={model.recovery ? model.recovery.score.toFixed(1) : 'N/A'}
      tone={tone}
      status={model.recoveryZone ? RECOVERY_LABEL[model.recoveryZone] : 'No check-in'}
      meter={<FillMeter fraction={model.recovery ? model.recovery.score / 10 : 0} tone={tone} />}
      note={recoveryNote(model.recovery)}
      size={size}
    />
  );
}

const EQUIPMENT_LEVELS: readonly EquipmentRisk[] = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];

export function EquipmentTile({ model, size }: PartProps) {
  const base = useAppBase();
  const profile = useOverview().profile;
  const risk = model.equipmentRisk;
  const tone = risk ? EQUIPMENT_TONE[risk] : 'neutral';
  return (
    <PartTile
      to={`${base}/equipment`}
      label={TILE_TITLES.equipment}
      value={risk ? EQUIPMENT_LABEL[risk].replace(' risk', '') : 'N/A'}
      tone={tone}
      status={risk ? EQUIPMENT_LABEL[risk] : 'Not set'}
      meter={<SegmentMeter filled={risk ? EQUIPMENT_LEVELS.indexOf(risk) + 1 : 0} total={EQUIPMENT_LEVELS.length} tone={tone} />}
      note={equipmentNote(profile)}
      size={size}
    />
  );
}

/** The score is multiplied by 1 to 2 for past injuries (calculations.ts), so the meter runs over that range. */
export function InjuryTile({ model, size }: PartProps) {
  const base = useAppBase();
  const { injuries } = useOverview();
  const { value } = model.injury;
  const tone: Tone = value >= 1.3 ? 'high' : value > 1 ? 'moderate' : 'low';
  return (
    <PartTile
      to={`${base}/injuries`}
      label={TILE_TITLES.injury}
      value={`×${value.toFixed(2)}`}
      tone={tone}
      status={value > 1 ? 'Raises score' : 'No extra risk'}
      meter={<FillMeter fraction={value - 1} tone={tone} />}
      note={injuryNote(injuries)}
      size={size}
    />
  );
}
