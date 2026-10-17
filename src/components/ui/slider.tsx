// Radix slider restyled from shadcn/ui: 44px touch row, 8px track, 24px thumb.
import * as React from 'react';
import { Slider as SliderPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Slider({
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-valuetext': ariaValueText,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  // Radix puts role="slider" on the thumb, so naming props must go there, not on the root
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn('relative flex h-11 w-full touch-none items-center select-none data-[disabled]:opacity-50', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden bg-sunken ring-1 ring-line ring-inset">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      {(props.value ?? props.defaultValue ?? [0]).map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-valuetext={ariaValueText}
          className="block size-6 border-2 border-accent bg-surface shadow-lift transition-[transform,box-shadow] duration-150 ease-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-95"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
