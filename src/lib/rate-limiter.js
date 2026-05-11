/**
 * PitchSafe — Client-Side Rate Limiter
 *
 * ARCHITECTURE NOTE:
 * PitchSafe is a pure client-side SPA (Vite + Firebase). There is no
 * custom backend server, so traditional HTTP middleware rate limiting
 * is not applicable here. This module implements the client-side
 * equivalent — enforced in the browser via localStorage before any
 * Firebase Auth or Firestore operation is attempted.
 *
 * Firebase Auth provides its own server-side brute-force protection.
 * This layer adds:
 *   1. Faster user feedback (no round-trip to Firebase)
 *   2. Per-email limiting on auth flows
 *   3. Per-user limiting on data write flows
 *   4. RateLimitError objects that mirror HTTP 429 semantics
 *      (status: 429, Retry-After, X-RateLimit-* fields)
 *
 * Limits are configurable via VITE_* environment variables
 * (baked in at build time by Vite).
 */

// ─── Configurable limits (set in .env) ───────────────────────────────────────

export const LIMITS = {
  /**
   * Auth routes: login, register
   * Default: 5 attempts per 15 minutes
   */
  auth: {
    maxAttempts: parseInt(import.meta.env.VITE_RATE_LIMIT_AUTH_MAX        ?? '5'),
    windowMs:    parseInt(import.meta.env.VITE_RATE_LIMIT_AUTH_WINDOW_MS  ?? '900000'), // 15 min
  },

  /**
   * Data write routes: sessions, recovery, injuries, equipment
   * Default: 20 writes per minute
   */
  write: {
    maxAttempts: parseInt(import.meta.env.VITE_RATE_LIMIT_WRITE_MAX       ?? '20'),
    windowMs:    parseInt(import.meta.env.VITE_RATE_LIMIT_WRITE_WINDOW_MS ?? '60000'),  // 1 min
  },

  /**
   * Delete operations: injury delete, session delete
   * Default: 10 deletes per minute
   */
  delete: {
    maxAttempts: parseInt(import.meta.env.VITE_RATE_LIMIT_DELETE_MAX      ?? '10'),
    windowMs:    parseInt(import.meta.env.VITE_RATE_LIMIT_DELETE_WINDOW_MS ?? '60000'), // 1 min
  },
};

const STORAGE_PREFIX = 'pitchsafe_rl:';

// ─── RateLimitError — mirrors HTTP 429 semantics ──────────────────────────────

export class RateLimitError extends Error {
  /**
   * @param {object} opts
   * @param {string}  opts.action      - Human label e.g. 'login'
   * @param {number}  opts.retryAfter  - Seconds until the window resets
   * @param {number}  opts.limit       - Max attempts allowed
   * @param {number}  opts.resetTime   - Unix ms when the window resets
   */
  constructor({ action, retryAfter, limit, resetTime }) {
    const mins = Math.ceil(retryAfter / 60);
    super(
      `Too many ${action} attempts. ` +
      `Please wait ${mins} minute${mins !== 1 ? 's' : ''} before trying again.`
    );
    this.name   = 'RateLimitError';

    // HTTP 429-equivalent fields
    this.status      = 429;
    this.retryAfter  = retryAfter;   // seconds  (mirrors Retry-After header)
    this.limit       = limit;         // mirrors X-RateLimit-Limit header
    this.remaining   = 0;             // mirrors X-RateLimit-Remaining header
    this.resetTime   = resetTime;     // ms       (mirrors X-RateLimit-Reset header)

    // Header map — if this ever moves to a Cloud Function these can be set directly
    this.headers = {
      'X-RateLimit-Limit':     String(limit),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset':     String(Math.ceil(resetTime / 1000)), // Unix seconds
      'Retry-After':           String(retryAfter),
    };
  }

  /** Human-readable retry message for the UI */
  get retryMessage() {
    const mins = Math.ceil(this.retryAfter / 60);
    const secs = this.retryAfter % 60;
    if (mins > 1) return `Try again in ${mins} minutes.`;
    if (secs > 30) return `Try again in about 1 minute.`;
    return `Try again in ${this.retryAfter} seconds.`;
  }
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadRecord(storageKey) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // parse error or storage unavailable — fail open
  }
}

function saveRecord(storageKey, record) {
  try {
    localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(record));
  } catch {
    // localStorage quota exceeded — fail open (don't block the user)
  }
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Check and record a rate-limited action. Must be called BEFORE
 * the actual operation (auth call, Firestore write, etc.).
 *
 * Throws RateLimitError if the limit has been reached.
 * Otherwise records the attempt and returns remaining info.
 *
 * @param {string} action   - Label for error messages (e.g. 'login')
 * @param {string} key      - Unique actor+action key (e.g. 'auth:login:user@x.com')
 * @param {{ maxAttempts: number, windowMs: number }} limits
 * @returns {{ remaining: number, resetTime: number }}
 */
export function checkRateLimit(action, key, limits) {
  const now    = Date.now();
  const record = loadRecord(key);

  // No record or window has expired — start a fresh window
  if (!record || now - record.windowStart >= limits.windowMs) {
    saveRecord(key, { count: 1, windowStart: now });
    return {
      remaining: limits.maxAttempts - 1,
      resetTime: now + limits.windowMs,
    };
  }

  // Within active window — check if limit exceeded
  if (record.count >= limits.maxAttempts) {
    const resetTime   = record.windowStart + limits.windowMs;
    const retryAfter  = Math.max(1, Math.ceil((resetTime - now) / 1000));
    throw new RateLimitError({ action, retryAfter, limit: limits.maxAttempts, resetTime });
  }

  // Allowed — increment and save
  record.count += 1;
  saveRecord(key, record);
  return {
    remaining: limits.maxAttempts - record.count,
    resetTime: record.windowStart + limits.windowMs,
  };
}

/**
 * Reset the rate limit for a key.
 * Call this after a SUCCESSFUL operation to clear the attempt count
 * (e.g., after a successful login, reset the login limit for that email).
 *
 * @param {string} key - Same key passed to checkRateLimit
 */
export function resetRateLimit(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch { /* ignore */ }
}

/**
 * Get the current state of a rate limit without recording an attempt.
 * Useful for pre-checking or showing remaining attempts in the UI.
 *
 * @param {string} key
 * @param {{ maxAttempts: number, windowMs: number }} limits
 * @returns {{ remaining: number, resetTime: number | null, isLimited: boolean }}
 */
export function getRateLimitStatus(key, limits) {
  const now    = Date.now();
  const record = loadRecord(key);

  if (!record || now - record.windowStart >= limits.windowMs) {
    return { remaining: limits.maxAttempts, resetTime: null, isLimited: false };
  }

  const remaining  = Math.max(0, limits.maxAttempts - record.count);
  const resetTime  = record.windowStart + limits.windowMs;
  const isLimited  = record.count >= limits.maxAttempts && now < resetTime;
  return { remaining, resetTime, isLimited };
}

// ─── Convenience builders ─────────────────────────────────────────────────────
// Pre-built key formats for consistent naming across the app

/** Auth key scoped to email (login / register) */
export const authKey    = (action, email) => `auth:${action}:${email.toLowerCase().trim()}`;

/** Write key scoped to authenticated user */
export const writeKey   = (action, uid)   => `write:${action}:${uid}`;

/** Delete key scoped to authenticated user */
export const deleteKey  = (action, uid)   => `delete:${action}:${uid}`;
