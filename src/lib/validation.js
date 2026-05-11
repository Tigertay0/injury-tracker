/**
 * PitchSafe — Central Input Validation Library
 *
 * Covers: XSS via allowlists, type coercion attacks, oversized payloads,
 * NoSQL injection via schema enforcement, path traversal via ID pattern checks.
 *
 * Pattern: reject-on-invalid (never guess or silently coerce).
 */

// ─── Allowlists ───────────────────────────────────────────────────────────────

export const ALLOWED_POSITIONS   = new Set(['GK', 'DEF', 'MID', 'FWD']);
export const ALLOWED_SESSION_TYPES = new Set(['training', 'match', 'gym']);
export const ALLOWED_SEVERITIES  = new Set(['mild', 'moderate', 'severe']);
export const ALLOWED_BODY_PARTS  = new Set([
  'Head','Neck','Shoulder (L)','Shoulder (R)',
  'Knee (L)','Knee (R)','Ankle (L)','Ankle (R)',
  'Hamstring (L)','Hamstring (R)','Quadriceps (L)','Quadriceps (R)',
  'Calf (L)','Calf (R)','Groin','Hip (L)','Hip (R)',
  'Lower Back','Wrist (L)','Wrist (R)','Foot (L)','Foot (R)',
]);
export const ALLOWED_INJURY_TYPES = new Set([
  'Strain','Sprain','Fracture','Tear','Contusion','Other',
]);
export const ALLOWED_CLEAT_TYPES = new Set([
  'FG_BLADED','FG_CONICAL','AG','SG','MG','INDOOR',
]);
export const ALLOWED_SURFACE_TYPES = new Set([
  'NATURAL_GOOD','NATURAL_POOR','3G_TURF','2G_TURF','HARD_GROUND','INDOOR',
]);

// ─── Primitive validators ─────────────────────────────────────────────────────

/** Reject if value is not in the allowlist set. Returns the value or throws. */
export function requireAllowlisted(value, allowlist, fieldName) {
  if (typeof value !== 'string' || !allowlist.has(value)) {
    throw new ValidationError(`Invalid value for "${fieldName}": "${value}"`);
  }
  return value;
}

/** Integer in [min, max]. Rejects NaN, floats, out-of-range, strings. */
export function requireInt(value, min, max, fieldName) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ValidationError(
      `"${fieldName}" must be an integer between ${min} and ${max} (got "${value}")`
    );
  }
  return n;
}

/** Float in [min, max]. Rejects NaN, out-of-range, non-numeric strings. */
export function requireFloat(value, min, max, step, fieldName) {
  const n = Number(value);
  if (!isFinite(n) || n < min || n > max) {
    throw new ValidationError(
      `"${fieldName}" must be a number between ${min} and ${max} (got "${value}")`
    );
  }
  // Round to nearest step to reject absurd precision injections
  return Math.round(n / step) * step;
}

/** ISO date string YYYY-MM-DD, not in the future beyond 1 day, not before 1990. */
export function requireDate(value, fieldName, { allowFuture = false } = {}) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`"${fieldName}" must be a date in YYYY-MM-DD format`);
  }
  const d = new Date(value + 'T00:00:00');
  if (isNaN(d.getTime())) {
    throw new ValidationError(`"${fieldName}" is not a valid calendar date`);
  }
  const minDate = new Date('1990-01-01');
  const maxDate = new Date();
  if (!allowFuture) maxDate.setDate(maxDate.getDate() + 1);
  else maxDate.setFullYear(maxDate.getFullYear() + 2);
  if (d < minDate || d > maxDate) {
    throw new ValidationError(`"${fieldName}" is out of acceptable date range`);
  }
  return value;
}

/**
 * Short free-text string (e.g. notes). Strips HTML tags entirely, enforces
 * max length, rejects if result differs from intent (XSS attempt).
 */
export function requireSafeText(value, maxLen, fieldName) {
  if (typeof value !== 'string') {
    throw new ValidationError(`"${fieldName}" must be a string`);
  }
  if (value.length > maxLen) {
    throw new ValidationError(
      `"${fieldName}" must be ${maxLen} characters or fewer`
    );
  }
  // Strip any HTML/script tags — if stripping changes the string, reject it
  const stripped = value.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '');
  if (stripped !== value) {
    throw new ValidationError(
      `"${fieldName}" contains disallowed characters (HTML/script)`
    );
  }
  return value.trim();
}

/** Email format. Only checks format — Firebase Auth handles the real validation. */
export function requireEmail(value, fieldName = 'email') {
  if (typeof value !== 'string' || value.length > 254) {
    throw new ValidationError(`"${fieldName}" is invalid`);
  }
  // RFC-5321 simplified pattern — rejects obvious injections
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(value)) {
    throw new ValidationError(`"${fieldName}" must be a valid email address`);
  }
  return value.trim().toLowerCase();
}

/** Firestore document ID (auto-generated). Prevents path traversal. */
export function requireFirestoreId(value, fieldName = 'id') {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) {
    throw new ValidationError(`"${fieldName}" is not a valid document ID`);
  }
  return value;
}

// ─── Composite schema validators ──────────────────────────────────────────────

export function validateSessionInput(raw) {
  return {
    date:     requireDate(raw.date,     'date'),
    type:     requireAllowlisted(raw.type, ALLOWED_SESSION_TYPES, 'type'),
    duration: requireInt(raw.duration,  1,   300, 'duration'),
    rpe:      requireInt(raw.rpe,       1,   10,  'rpe'),
    notes:    raw.notes ? requireSafeText(raw.notes, 500, 'notes') : '',
  };
}

export function validateRecoveryInput(raw) {
  return {
    weekStartDate: requireDate(raw.weekStartDate, 'weekStartDate'),
    sleep:         requireFloat(raw.sleep,    0, 12, 0.5, 'sleep'),
    soreness:      requireInt(raw.soreness,   1, 10,      'soreness'),
    stress:        requireInt(raw.stress,     1, 10,      'stress'),
    nutrition:     requireInt(raw.nutrition,  1, 10,      'nutrition'),
  };
}

export function validateInjuryInput(raw) {
  const out = {
    bodyPart:    requireAllowlisted(raw.bodyPart,    ALLOWED_BODY_PARTS,   'bodyPart'),
    injuryType:  requireAllowlisted(raw.injuryType,  ALLOWED_INJURY_TYPES, 'injuryType'),
    severity:    requireAllowlisted(raw.severity,    ALLOWED_SEVERITIES,   'severity'),
    injuryDate:  requireDate(raw.injuryDate, 'injuryDate'),
    returnDate:  null,
  };
  if (raw.returnDate) {
    out.returnDate = requireDate(raw.returnDate, 'returnDate', { allowFuture: true });
    if (out.returnDate < out.injuryDate) {
      throw new ValidationError('"returnDate" cannot be before "injuryDate"');
    }
  }
  return out;
}

export function validateEquipmentInput(raw) {
  const out = {};
  if ('cleatType' in raw) {
    out.cleatType = requireAllowlisted(raw.cleatType, ALLOWED_CLEAT_TYPES, 'cleatType');
  }
  if ('surfaceType' in raw) {
    out.surfaceType = requireAllowlisted(raw.surfaceType, ALLOWED_SURFACE_TYPES, 'surfaceType');
  }
  if (Object.keys(out).length === 0) {
    throw new ValidationError('Equipment update must include cleatType or surfaceType');
  }
  return out;
}

export function validateRegistrationInput(raw) {
  return {
    email:    requireEmail(raw.email),
    position: requireAllowlisted(raw.position, ALLOWED_POSITIONS, 'position'),
    // password length enforced by Firebase Auth (min 6) — we only check it's a string
    password: (typeof raw.password === 'string' && raw.password.length >= 6 && raw.password.length <= 128)
      ? raw.password
      : (() => { throw new ValidationError('Password must be 6–128 characters'); })(),
  };
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}
