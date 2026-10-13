// Confirm dialog on Radix AlertDialog (focus trap, Esc, labelled), restyled from
// shadcn/ui. Motion: transitions.dev "Modal open / close" timings via .dialog-panel.
import * as React from 'react';
import { AlertDialog as Primitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

const AlertDialog = Primitive.Root;
const AlertDialogTrigger = Primitive.Trigger;

function AlertDialogContent({ className, children, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="sheet-overlay fixed inset-0 z-40 bg-[oklch(0.2_0.02_255/0.45)]" />
      <Primitive.Content
        className={cn(
          'dialog-panel shadow-overlay fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-panel)] border border-line bg-surface p-6 text-ink',
          className,
        )}
        {...props}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title className={cn('font-display text-h3 font-extrabold text-ink', className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description className={cn('mt-2 text-body text-ink-2', className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}

function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof Primitive.Cancel>) {
  return <Primitive.Cancel className={cn(buttonVariants({ variant: 'secondary' }), className)} {...props} />;
}

function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof Primitive.Action>) {
  return <Primitive.Action className={cn(buttonVariants({ variant: 'danger' }), className)} {...props} />;
}

export { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction };
