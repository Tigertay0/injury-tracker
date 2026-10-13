import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The project's role-named type sizes (styles.css @theme). Without this, tailwind-merge
// reads `text-score` as a colour and drops it when a `text-risk-*` colour follows.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['caption', 'label', 'small', 'body', 'lead', 'h3', 'h2', 'h1', 'display-s', 'display-m', 'display-l', 'score'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
