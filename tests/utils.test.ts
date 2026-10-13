import { describe, expect, it } from 'vitest';
import { cn } from '../src/lib/utils';

describe('cn', () => {
  it('keeps a role type size next to a colour class', () => {
    expect(cn('text-score', 'text-risk-moderate')).toBe('text-score text-risk-moderate');
    expect(cn('font-display text-h1', 'text-ink')).toBe('font-display text-h1 text-ink');
  });

  it('still lets a later size override an earlier one', () => {
    expect(cn('text-body', 'text-small')).toBe('text-small');
  });
});
