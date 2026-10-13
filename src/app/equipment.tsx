// Cleats and surface (PRD 2.3). Choices save as soon as they are picked. Once a
// surface is chosen, every cleat row shows its risk on that surface.
import { useState } from 'react';
import { toast } from 'sonner';
import { CLEAT_TYPES, SURFACE_TYPES, cleatName, equipmentExplanation, equipmentRisk, saferCleatsFor } from '@shared/equipment';
import type { CleatType, SurfaceType } from '@shared/types';
import { FieldSet } from '@/components/field';
import { RiskChip } from '@/components/risk-chip';
import { RadioRows } from '@/components/ui/radio-rows';
import { errorMessage } from '@/lib/api';
import { EQUIPMENT_LABEL, EQUIPMENT_SHORT, EQUIPMENT_TONE } from '@/lib/labels';
import { useOverview, usePlayerData } from '@/lib/player-data';
import { cn } from '@/lib/utils';
import { PageHeader } from './page-header';

export default function Equipment() {
  const { profile } = useOverview();
  const { actions } = usePlayerData();
  const [pending, setPending] = useState<'cleatType' | 'surfaceType' | null>(null);

  const cleat = profile?.cleatType ?? null;
  const surface = profile?.surfaceType ?? null;
  const risk = cleat && surface ? equipmentRisk(cleat, surface) : null;
  const safer = surface ? saferCleatsFor(surface).filter((c) => c !== cleat) : [];

  async function save(field: 'cleatType' | 'surfaceType', value: CleatType | SurfaceType) {
    setPending(field);
    try {
      await actions.updateEquipment({ [field]: value });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <PageHeader title="Cleats and surface" description="Studs that grip too hard lock your foot while your body turns. Set what you usually wear and where you usually play." />

      {risk && (
        <section
          aria-live="polite"
          className={cn('mb-6 rounded-[var(--radius-panel)] border p-5 md:p-6', risk === 'VERY_HIGH' ? 'border-risk-very-high bg-risk-very-high-soft' : 'border-line bg-surface')}
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lead font-semibold text-ink">Your pairing</h2>
            <RiskChip tone={EQUIPMENT_TONE[risk]}>{EQUIPMENT_LABEL[risk]}</RiskChip>
          </div>
          <p className="mt-2 max-w-2xl text-body text-ink">{equipmentExplanation(risk)}</p>
          {(risk === 'HIGH' || risk === 'VERY_HIGH' || risk === 'MEDIUM') && safer.length > 0 && (
            <p className="mt-3 text-body font-semibold text-ink">Better match for this surface: {safer.map((c) => cleatName(c)).join(' or ')}.</p>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <FieldSet legend="Where do you usually play?" hint="Pick the surface you train and play on most.">
          <RadioRows
            aria-label="Usual surface"
            value={surface}
            disabled={pending === 'surfaceType'}
            onValueChange={(v) => void save('surfaceType', v)}
            options={SURFACE_TYPES.map((s) => ({ value: s.id, label: s.name, description: s.description }))}
          />
        </FieldSet>

        <FieldSet legend="Which cleats do you wear?" hint={surface ? 'The label shows each type’s risk on your surface.' : 'Choose your surface first to see each type’s risk.'}>
          <RadioRows
            aria-label="Cleat type"
            value={cleat}
            disabled={pending === 'cleatType'}
            onValueChange={(v) => void save('cleatType', v)}
            options={CLEAT_TYPES.map((c) => {
              const r = surface ? equipmentRisk(c.id, surface) : null;
              return {
                value: c.id,
                label: c.name,
                description: c.description,
                trailing: r ? (
                  <RiskChip tone={EQUIPMENT_TONE[r]} className="shrink-0">
                    {EQUIPMENT_SHORT[r]}
                  </RiskChip>
                ) : undefined,
              };
            })}
          />
        </FieldSet>
      </div>
    </>
  );
}
