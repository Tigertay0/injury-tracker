import type { ReactNode } from 'react';

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-h1 font-extrabold tracking-[-0.01em] text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-body text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}
