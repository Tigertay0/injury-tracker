import type { ReactNode } from 'react';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[44rem] px-5 pt-10 pb-20 sm:px-8 md:pt-16">
      <h1 className="font-display text-h1 font-extrabold text-ink sm:text-display-s">{title}</h1>
      <p className="mt-3 text-small text-ink-3">Last updated {updated}</p>
      <div className="mt-10 space-y-8 text-body text-ink-2 [&_h2]:font-display [&_h2]:text-h3 [&_h2]:font-extrabold [&_h2]:text-ink [&_li]:mt-1.5 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}
