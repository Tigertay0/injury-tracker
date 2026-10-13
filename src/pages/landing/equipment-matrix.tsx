// The real cleat x surface table from shared/equipment, with a word in every cell
// so the colour is never the only signal.
import { CLEAT_TYPES, SURFACE_TYPES, equipmentRisk } from '@shared/equipment';
import { EQUIPMENT_SHORT, EQUIPMENT_TONE, TONE_CHIP } from '@/lib/labels';
import { cn } from '@/lib/utils';

export function EquipmentMatrix({ className }: { className?: string }) {
  return (
    <div className={cn('-mx-1 overflow-x-auto px-1', className)}>
      <table className="w-full min-w-[30rem] border-separate border-spacing-[3px] text-caption">
        <caption className="sr-only">Injury risk for each cleat type on each playing surface</caption>
        <thead>
          <tr>
            <th scope="col" className="w-14 text-left font-semibold text-ink-2">
              <span className="sr-only">Cleat</span>
            </th>
            {SURFACE_TYPES.map((s) => (
              <th key={s.id} scope="col" className="px-1 pb-1 text-center font-semibold text-ink-2">
                {s.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CLEAT_TYPES.map((c) => (
            <tr key={c.id}>
              <th scope="row" className="pr-2 text-left font-semibold text-ink" title={c.name}>
                {c.short}
              </th>
              {SURFACE_TYPES.map((s) => {
                const risk = equipmentRisk(c.id, s.id);
                return (
                  <td key={s.id} className={cn('rounded-[6px] px-1 py-2 text-center font-semibold', TONE_CHIP[EQUIPMENT_TONE[risk]])}>
                    {EQUIPMENT_SHORT[risk]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
