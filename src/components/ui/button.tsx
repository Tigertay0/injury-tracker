// Restyled from the shadcn/ui button to PitchSafe tokens: 10px radius, 44px default
// height (touch target), press scale, exact transition properties.
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'press inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] font-semibold outline-none disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-on-accent hover:bg-accent-hover',
        secondary: 'border border-line-strong bg-surface text-ink hover:border-ink-3 hover:bg-sunken',
        ghost: 'text-ink hover:bg-sunken',
        danger: 'bg-risk-very-high text-ink-inverse hover:opacity-90',
        inverse: 'bg-surface text-ink hover:bg-sunken',
      },
      size: {
        sm: 'h-9 px-3.5 text-small [&_svg]:size-4',
        md: 'h-11 px-5 text-body [&_svg]:size-[18px]',
        lg: 'h-13 px-6 text-lead [&_svg]:size-5',
        icon: 'size-11 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
