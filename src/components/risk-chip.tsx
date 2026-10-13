import { CheckCircle, Info, Warning, WarningOctagon, Minus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { TONE_CHIP, type Tone } from '@/lib/labels';

const ICON = { low: CheckCircle, moderate: Info, high: Warning, 'very-high': WarningOctagon, neutral: Minus } as const;

/** Status chip: colour, icon and word together so colour is never the only signal. */
export function RiskChip({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  const Icon = ICON[tone];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] px-2.5 py-1 text-label font-semibold', TONE_CHIP[tone], className)}>
      <Icon weight="fill" aria-hidden className="size-3.5" />
      {children}
    </span>
  );
}
