// Radio rows: adapted from 21st.dev sean0205/c-radio-group-8 "Radio Group in Card with
// Separators" (https://21st.dev/@sean0205/components/c-radio-group-8), extended with a
// one-line explainer and optional trailing slot per row (Gentler Streak's status rows).
// Radix RadioGroup supplies roving focus and arrow-key selection.
import * as React from 'react';
import { RadioGroup as Primitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export interface RadioRowOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
}

interface RadioRowsProps<T extends string> {
  value: T | null;
  onValueChange: (value: T) => void;
  options: readonly RadioRowOption<T>[];
  'aria-label'?: string;
  'aria-labelledby'?: string;
  disabled?: boolean;
  /** Marks the group as saving without blocking keyboard focus. */
  busy?: boolean;
  className?: string;
}

export function RadioRows<T extends string>({ value, onValueChange, options, disabled, busy, className, ...aria }: RadioRowsProps<T>) {
  return (
    <Primitive.Root
      value={value ?? ''}
      onValueChange={(v) => onValueChange(v as T)}
      disabled={disabled}
      aria-busy={busy || undefined}
      className={cn('overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface', className)}
      {...aria}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className="flex min-h-14 cursor-pointer items-center gap-3.5 border-b border-line px-4 py-3 last:border-b-0 hover:bg-sunken has-[[data-state=checked]]:bg-accent-soft"
        >
          <Primitive.Item
            value={o.value}
            className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-line-strong bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[state=checked]:border-accent"
          >
            <Primitive.Indicator className="size-2.5 rounded-full bg-accent" />
          </Primitive.Item>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold text-ink">{o.label}</span>
            {o.description && <span className="block text-label text-ink-2">{o.description}</span>}
          </span>
          {o.trailing}
        </label>
      ))}
    </Primitive.Root>
  );
}
