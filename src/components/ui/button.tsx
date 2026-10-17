// PitchSafe button on the 21st.dev OriginButton (origin-button.tsx): 12px corners (--radius-control),
// 44px default height (touch target), and a circle that grows from the pointer on hover or press.
// `buttonVariants` is the static look (rest state, no fill) for class-only uses; <Button> adds the fill.
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { OriginButton, type OriginButtonProps } from './origin-button';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] font-semibold tracking-[-0.015em] disabled:pointer-events-none disabled:opacity-55 aria-disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-on-accent',
        secondary: 'border border-line-strong bg-surface text-ink',
        ghost: 'text-ink',
        danger: 'bg-risk-very-high text-ink-inverse',
        // The opposite of the ground: light on the night marketing pages, dark on a light screen
        inverse: 'border border-ink bg-ink text-ink-inverse',
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

type Variant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;

/**
 * What floods the button, and the text and border colour that read over it. A darker fill is a
 * mix of the base colour with --ink, done in oklab: oklch would swing the red toward magenta along the hue
 * circle, because --ink is a blue-grey. In the dark theme --ink is light, so the mix lifts instead of darkening.
 * The rest-state text of primary and danger already reads over their fill, so they add nothing.
 */
const FILL: Record<Variant, { fill: string; filled?: string }> = {
  primary: { fill: 'bg-[color-mix(in_oklab,var(--accent),var(--ink)_35%)]' },
  secondary: { fill: 'bg-ink', filled: 'border-ink text-surface' },
  ghost: { fill: 'bg-sunken', filled: 'text-ink' },
  danger: { fill: 'bg-[color-mix(in_oklab,var(--risk-very-high),var(--ink)_35%)]' },
  inverse: { fill: 'bg-surface', filled: 'text-ink' },
};

export interface ButtonProps extends Omit<OriginButtonProps, 'fillClassName' | 'filledClassName'>, VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  const { fill, filled } = FILL[variant ?? 'primary'];
  return (
    <OriginButton
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      fillClassName={fill}
      filledClassName={filled}
      {...props}
    />
  );
}

export { Button, buttonVariants };
