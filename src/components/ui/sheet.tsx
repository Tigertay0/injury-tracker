// Side drawer on Radix Dialog (focus trap, Esc, scroll lock), restyled from the
// shadcn/ui sheet. Motion lives in styles.css (.sheet-*) with a reduced-motion guard.
import * as React from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: 'right' | 'bottom' }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="sheet-overlay fixed inset-0 z-40 bg-[oklch(0.2_0.02_255/0.45)]" />
      <SheetPrimitive.Content
        data-side={side}
        className={cn(
          'sheet-panel fixed z-50 flex flex-col bg-surface text-ink outline-none shadow-overlay',
          side === 'right' ? 'top-[env(safe-area-inset-top)] bottom-0 right-0 w-[min(20rem,86vw)] border-l border-line' : 'inset-x-0 bottom-0 max-h-[85dvh] border-t border-line pb-[env(safe-area-inset-bottom)]',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="press absolute top-3 right-3 grid size-11 place-items-center rounded-[var(--radius-control)] text-ink-2 hover:bg-sunken hover:text-ink">
          <X className="size-5" aria-hidden />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn('text-h3 font-display font-semibold text-ink', className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn('text-small text-ink-2', className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
