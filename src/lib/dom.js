// Shared DOM helpers used by the page modules

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escapes any HTML in Firestore/auth-sourced strings before injecting into innerHTML
// (safe for both text content and quoted attribute values)
export function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
}

export function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('visible'); }
}

export function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('visible');
}

// Formats a stored YYYY-MM-DD string as a local calendar date
export function fmtDate(d, { withYear = false } = {}) {
  if (!d) return '';
  const opts = withYear
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric' };
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', opts);
}

// YYYY-MM-DD for the user's local calendar day (toISOString() would give the UTC day)
export function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Error shown in place of page content when the initial Firestore load fails
export const LOAD_ERROR_HTML =
  '<div class="card"><p class="auth-error visible">Failed to load your data. Please check your connection and refresh.</p></div>';
