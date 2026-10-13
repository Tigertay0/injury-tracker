// Human labels and colour roles for every zone. Colour is never the only signal:
// each zone also has a word and an icon.
import type { AcwrZone, CompositeZone, EquipmentRisk, Position, RecoveryZone, SessionType, Severity } from '@shared/types';

export type Tone = 'low' | 'moderate' | 'high' | 'very-high' | 'neutral';

export const POSITION_LABEL: Record<Position, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward or winger',
};

export const SESSION_LABEL: Record<SessionType, string> = { training: 'Training', match: 'Match', gym: 'Gym' };
export const SEVERITY_LABEL: Record<Severity, string> = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' };
export const SEVERITY_HINT: Record<Severity, string> = { mild: 'Back within a week', moderate: 'Out for 1 to 4 weeks', severe: 'Out for more than 4 weeks' };

export const ACWR_LABEL: Record<AcwrZone, string> = {
  NA: 'Not enough data',
  UNDERTRAINING: 'Undertraining',
  SWEET_SPOT: 'Sweet spot',
  CAUTION: 'Caution',
  DANGER: 'Danger',
};
export const ACWR_TONE: Record<AcwrZone, Tone> = { NA: 'neutral', UNDERTRAINING: 'moderate', SWEET_SPOT: 'low', CAUTION: 'high', DANGER: 'very-high' };
export const ACWR_MEANING: Record<AcwrZone, string> = {
  NA: 'Log four weeks of sessions to unlock your ratio.',
  UNDERTRAINING: 'Well below your usual load. Building back too fast from here is risky.',
  SWEET_SPOT: 'In line with your last month. The range linked to the fewest injuries.',
  CAUTION: 'Noticeably more than you are used to. Hold here and do not add more.',
  DANGER: 'A spike well above your 4-week average. Cut back this week.',
};

export const RECOVERY_LABEL: Record<RecoveryZone, string> = { GOOD: 'Good', MODERATE: 'Moderate', POOR: 'Poor' };
export const RECOVERY_TONE: Record<RecoveryZone, Tone> = { GOOD: 'low', MODERATE: 'moderate', POOR: 'very-high' };

export const EQUIPMENT_LABEL: Record<EquipmentRisk, string> = { LOW: 'Low risk', MEDIUM: 'Medium risk', HIGH: 'High risk', VERY_HIGH: 'Very high risk' };
export const EQUIPMENT_SHORT: Record<EquipmentRisk, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', VERY_HIGH: 'Very high' };
export const EQUIPMENT_TONE: Record<EquipmentRisk, Tone> = { LOW: 'low', MEDIUM: 'moderate', HIGH: 'high', VERY_HIGH: 'very-high' };

export const COMPOSITE_LABEL: Record<CompositeZone, string> = { LOW: 'Low risk', MODERATE: 'Moderate risk', HIGH: 'High risk', VERY_HIGH: 'Very high risk' };
export const COMPOSITE_TONE: Record<CompositeZone, Tone> = { LOW: 'low', MODERATE: 'moderate', HIGH: 'high', VERY_HIGH: 'very-high' };
export const COMPOSITE_VERDICT: Record<CompositeZone, string> = {
  LOW: 'Train as planned. Your load, recovery and kit all look sensible.',
  MODERATE: 'Some warning signs. Follow the top action below before your next hard session.',
  HIGH: 'Your risk is up. Ease off this week and fix the flagged items.',
  VERY_HIGH: 'Several risk factors at once. Take a lighter week and deal with the alerts below first.',
};

export const TONE_TEXT: Record<Tone, string> = {
  low: 'text-risk-low',
  moderate: 'text-risk-moderate',
  high: 'text-risk-high',
  'very-high': 'text-risk-very-high',
  neutral: 'text-ink-2',
};
export const TONE_CHIP: Record<Tone, string> = {
  low: 'bg-risk-low-soft text-risk-low',
  moderate: 'bg-risk-moderate-soft text-risk-moderate',
  high: 'bg-risk-high-soft text-risk-high',
  'very-high': 'bg-risk-very-high-soft text-risk-very-high',
  neutral: 'bg-sunken text-ink-2',
};
export const TONE_FILL: Record<Tone, string> = {
  low: 'var(--risk-low)',
  moderate: 'var(--risk-moderate)',
  high: 'var(--risk-high)',
  'very-high': 'var(--risk-very-high)',
  neutral: 'var(--chart-past)',
};

const DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const DATE_FMT_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const WEEKDAY_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });

/** Formats a stored YYYY-MM-DD calendar day without time-zone shifts. */
export function fmtDate(iso: string, withYear = false): string {
  return (withYear ? DATE_FMT_YEAR : DATE_FMT).format(new Date(`${iso}T00:00:00Z`));
}
export function fmtWeekday(iso: string): string {
  return WEEKDAY_FMT.format(new Date(`${iso}T00:00:00Z`));
}
