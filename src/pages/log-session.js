// Log Session — with full input validation and rate limiting
import { auth } from '../firebase.js';
import { renderAppShell } from '../components/app-shell.js';
import { addSession, getSessions } from '../lib/firestore.js';
import { calculateSessionLoad } from '../lib/calculations.js';
import { validateSessionInput, ValidationError } from '../lib/validation.js';
import { checkRateLimit, LIMITS, RateLimitError, writeKey } from '../lib/rate-limiter.js';
import { navigate } from '../router.js';

export async function renderLogSession() {
  const user = auth.currentUser;
  if (!user) { navigate('/auth'); return; }

  const sessions = await getSessions(user.uid);
  const today = new Date().toISOString().split('T')[0];

  renderAppShell(`
    <div class="dashboard-header">
      <div>
        <h1 class="type-page-title">LOG SESSION</h1>
        <p style="color:var(--on-surface-variant);margin-top:var(--space-xs);">Record your training data accurately to maintain optimal load management and injury prevention modeling.</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h2 class="card-title" style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-lg);">
          <span class="material-symbols-outlined" style="color:var(--primary);">history_edu</span>
          Session Details
        </h2>
        <div class="auth-error" id="session-error"></div>
        <form id="session-form" class="flex-col">
          <div class="form-group">
            <label class="form-label" for="session-date">Date</label>
            <input class="form-input" type="date" id="session-date" value="${today}" max="${today}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="session-type">Session Type</label>
            <select class="form-input" id="session-type" required>
              <option value="training">Training</option>
              <option value="match">Match</option>
              <option value="gym">Gym / Weights</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="session-duration">Duration (minutes)</label>
            <input class="form-input" type="number" id="session-duration" min="1" max="300" placeholder="90" required />
          </div>
          <div class="form-group">
            <label class="form-label">RPE — Rate of Perceived Exertion</label>
            <div class="slider-container">
              <input type="range" class="slider-input" id="session-rpe" min="1" max="10" value="5" />
              <div class="slider-labels"><span>1 (Rest)</span><span>5 (Hard)</span><span>10 (Max)</span></div>
              <div class="slider-value" id="rpe-display">5</div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="session-notes">Notes (optional, max 500 chars)</label>
            <textarea class="form-input" id="session-notes" placeholder="Any additional details..." rows="2" maxlength="500"></textarea>
          </div>
          <button type="submit" class="btn btn-primary w-full mt-md">
            <span class="material-symbols-outlined">save</span>
            SAVE SESSION
          </button>
        </form>
      </div>

      <div class="flex-col" style="gap:var(--space-lg);">
        <div class="card" style="text-align:center;">
          <h2 class="card-title" style="display:flex;align-items:center;justify-content:center;gap:var(--space-sm);margin-bottom:var(--space-md);">
            <span class="material-symbols-outlined" style="color:var(--primary);">speed</span>
            Est. Session Load
          </h2>
          <p style="font-size:12px;color:var(--on-surface-variant);margin-bottom:var(--space-sm);">Duration × RPE Intensity</p>
          <div class="type-risk-display" style="font-size:64px;color:var(--primary);" id="load-preview">—</div>
          <p style="font-size:12px;color:var(--on-surface-variant);margin-top:var(--space-sm);">Arbitrary Units (AU)</p>
        </div>

        <div class="card">
          <h2 class="card-title" style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-md);">
            <span class="material-symbols-outlined" style="color:var(--primary);">schedule</span>
            Recent Sessions
          </h2>
          ${sessions.length === 0 ? `
            <div class="empty-state"><p>No sessions logged yet.<br/>Log your first session to start tracking.</p></div>
          ` : `
            <table class="data-table">
              <thead><tr><th>Date</th><th>Type</th><th>Dur</th><th>RPE</th><th>Load</th></tr></thead>
              <tbody>
                ${sessions.slice(0, 8).map(s => `
                  <tr>
                    <td>${fmtDate(s.date)}</td>
                    <td style="text-transform:capitalize;">${escHtml(String(s.type))}</td>
                    <td>${Number(s.duration)}m</td>
                    <td>${Number(s.rpe)}</td>
                    <td><strong>${Number(s.load)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    </div>
  `);

  const rpeSlider     = document.getElementById('session-rpe');
  const rpeDisplay    = document.getElementById('rpe-display');
  const durationInput = document.getElementById('session-duration');
  const loadPreview   = document.getElementById('load-preview');

  function updatePreview() {
    const dur = parseInt(durationInput.value) || 0;
    const rpe = parseInt(rpeSlider.value);
    rpeDisplay.textContent = rpe;
    loadPreview.textContent = dur > 0 ? calculateSessionLoad(dur, rpe) : '—';
  }

  rpeSlider.addEventListener('input', updatePreview);
  durationInput.addEventListener('input', updatePreview);

  document.getElementById('session-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('session-error');
    try {
      const validated = validateSessionInput({
        date:     document.getElementById('session-date').value,
        type:     document.getElementById('session-type').value,
        duration: document.getElementById('session-duration').value,
        rpe:      rpeSlider.value,
        notes:    document.getElementById('session-notes').value,
      });
      // Rate limit: 20 writes / 1 min per user — BEFORE Firestore write
      checkRateLimit('log session', writeKey('session', user.uid), LIMITS.write);
      await addSession(user.uid, validated);
      navigate('/log-session');
    } catch (err) {
      if (err.name === 'RateLimitError') showError('session-error', err.message);
      else if (err.name === 'ValidationError') showError('session-error', err.message);
      else showError('session-error', 'Failed to save session. Please try again.');
    }
  });
}

function fmtDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function escHtml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showError(id, msg) { const el = document.getElementById(id); if (el) { el.textContent = msg; el.classList.add('visible'); } }
function hideError(id) { const el = document.getElementById(id); if (el) el.classList.remove('visible'); }
