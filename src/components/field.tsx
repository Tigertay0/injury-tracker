// Labelled form fields with inline errors. The error shake comes from transitions.dev
// (12-error-state-shake); unlike the demo, the message stays until the field changes.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const inputClass =
  'w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 text-body text-ink placeholder:text-ink-3 outline-none focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus aria-[invalid=true]:border-risk-very-high';

const SHAKE_MS = 80 * 2 + 60 * 2 + 20;

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  /** Bump to replay the shake on a repeated failed submit. */
  shakeKey?: number;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid': boolean }) => ReactNode;
  className?: string;
}

export function Field({ label, hint, error, shakeKey = 0, children, className }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!error || !box) return;
    box.classList.remove('is-shaking');
    void box.offsetWidth; // reflow so the animation replays
    box.classList.add('is-shaking');
    box.querySelector<HTMLElement>('input, select, textarea')?.focus();
    const t = setTimeout(() => box.classList.remove('is-shaking'), SHAKE_MS);
    return () => clearTimeout(t);
  }, [error, shakeKey]);

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('t-input-wrap flex flex-col gap-1.5', error && 'is-error', className)}>
      <label htmlFor={id} className="text-small font-semibold text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="-mt-0.5 text-label text-ink-2">
          {hint}
        </p>
      )}
      <div ref={boxRef} className={cn('t-input', error && 'is-error')}>
        {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      </div>
      <p id={errorId} role="alert" className="t-error-msg min-h-5 text-label font-medium text-risk-very-high">
        {error ?? ''}
      </p>
    </div>
  );
}

/** A group of related controls (radio rows, sliders) with one legend and error. */
export function FieldSet({ legend, hint, error, children, className }: { legend: string; hint?: string; error?: string | null; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <fieldset className={cn('t-input-wrap flex min-w-0 flex-col gap-2', error && 'is-error', className)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}>
      <legend className="mb-1 text-small font-semibold text-ink">{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} className="-mt-1 text-label text-ink-2">
          {hint}
        </p>
      )}
      {children}
      <p id={`${id}-error`} role="alert" className="t-error-msg min-h-5 text-label font-medium text-risk-very-high">
        {error ?? ''}
      </p>
    </fieldset>
  );
}
