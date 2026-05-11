// Recovery — with full input validation and rate limiting
import { auth } from '../firebase.js';
import { renderAppShell } from '../components/app-shell.js';
import { addRecoveryLog, getRecoveryLogs } from '../lib/firestore.js';
import { calculateRecoveryScore, getRecoveryZone, getRiskBadgeClass, getZoneLabel } from '../lib/calculations.js';
import { validateRecoveryInput, ValidationError } from '../lib/validation.js';
import { checkRateLimit, LIMITS, RateLimitError, writeKey } from '../lib/rate-limiter.js';
import { navigate } from '../router.js';

export async function renderRecovery() {
  const user = auth.currentUser;
  if (!user) { navigate('/auth'); return; }
  const logs = await getRecoveryLogs(user.uid);
  const weekStart = getWeekStart();

  renderAppShell(`
    <div class="dashboard-header">
      <div>
        <h1 class="type-page-title">DAILY RECOVERY</h1>
        <p style="color:var(--on-surface-variant);margin-top:var(--space-xs);">Log your metrics to update your injury prevention profile.</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h2 class="card-title" style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-lg);">
          <span class="material-symbols-outlined" style="color:var(--primary);">health_and_safety</span>
          Update Metrics
        </h2>
        <div class="auth-error" id="recovery-error"></div>
        <form id="recovery-form" class="flex-col">
          <div class="form-group">
            <label class="form-label" for="rec-week">Week Starting</label>
            <input class="form-input" type="date" id="rec-week" value="${weekStart}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Sleep (hours/night)</label>
            <input class="form-input" type="number" id="rec-sleep" min="0" max="12" step="0.5" placeholder="7.5" required />
          </div>
          <div class="form-group">
            <label class="form-label">Muscle Soreness</label>
            <div class="slider-container">
              <input type="range" class="slider-input" id="rec-soreness" min="1" max="10" value="3" />
              <div class="slider-labels"><span>1 (None)</span><span>10 (Severe)</span></div>
              <div class="slider-value" id="soreness-display">3</div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Stress Level</label>
            <div class="slider-container">
              <input type="range" class="slider-input" id="rec-stress" min="1" max="10" value="3" />
              <div class="slider-labels"><span>1 (Low)</span><span>10 (High)</span></div>
              <div class="slider-value" id="stress-display">3</div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Nutrition Quality</label>
            <div class="slider-container">
              <input type="range" class="slider-input" id="rec-nutrition" min="1" max="10" value="6" />
              <div class="slider-labels"><span>1 (Poor)</span><span>10 (Excellent)</span></div>
              <div class="slider-value" id="nutrition-display">6</div>
            </div>
          </div>
          <button type="submit" class="btn btn-primary w-full mt-md">
            <span class="material-symbols-outlined">save</span>
            SAVE RECOVERY LOG
          </button>
        </form>
      </div>

      <div class="flex-col" style="gap:var(--space-lg);">
        <div class="card" style="text-align:center;">
          <h2 class="card-title" style="display:flex;align-items:center;justify-content:center;gap:var(--space-sm);margin-bottom:var(--space-md);">
            <span class="material-symbols-outlined" style="color:var(--primary);">speed</span>
            Score Preview
          </h2>
          <div class="type-risk-display" style="font-size:64px;" id="score-preview">—</div>
          <span class="risk-badge mt-sm" id="score-badge" style="display:none;"></span>
          <p style="font-size:13px;color:var(--on-surface-variant);margin-top:var(--space-md);" id="preview-text">Your simulated recovery based on current input indicates a low risk of overload.</p>
        </div>

        <div class="card">
          <h2 class="card-title" style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-md);">
            <span class="material-symbols-outlined" style="color:var(--primary);">trending_up</span>
            Recovery Trend
          </h2>
          ${logs.length === 0 ? '<div class="empty-state"><p>No recovery logs yet.</p></div>' : `
            <table class="data-table">
              <thead><tr><th>Week</th><th>Sleep</th><th>Score</th><th>Status</th></tr></thead>
              <tbody>${logs.slice(0, 10).map(l => {
                const z = getRecoveryZone(l.score);
                return `<tr><td>${fmtDate(l.weekStartDate)}</td><td>${Number(l.sleep)}h</td><td><strong>${Number(l.score)}</strong></td><td><span class="risk-badge ${getRiskBadgeClass(z)}">${getZoneLabel(z)}</span></td></tr>`;
              }).join('')}</tbody>
            </table>
          `}
        </div>
      </div>
    </div>
  `);

  ['soreness','stress','nutrition'].forEach(n => {
    const s = document.getElementById(`rec-${n}`);
    const d = document.getElementById(`${n}-display`);
    s.addEventListener('input', () => { d.textContent = s.value; updatePreview(); });
  });
  document.getElementById('rec-sleep').addEventListener('input', updatePreview);

  function updatePreview() {
    const sleep = parseFloat(document.getElementById('rec-sleep').value) || 0;
    if (sleep <= 0) return;
    const score = calculateRecoveryScore(
      sleep,
      parseInt(document.getElementById('rec-soreness').value),
      parseInt(document.getElementById('rec-stress').value),
      parseInt(document.getElementById('rec-nutrition').value)
    );
    const zone = getRecoveryZone(score);
    document.getElementById('score-preview').textContent = score;
    const badge = document.getElementById('score-badge');
    badge.style.display = '';
    badge.className = `risk-badge ${getRiskBadgeClass(zone)}`;
    badge.textContent = getZoneLabel(zone);
    document.getElementById('preview-text').textContent =
      zone === 'GOOD' ? 'Your recovery metrics indicate low risk of overload.' :
      zone === 'MODERATE' ? 'Recovery is moderate. Focus on sleep and hydration.' :
      'Recovery is poor. Consider a rest day.';
  }

  document.getElementById('recovery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('recovery-error');
    try {
      const validated = validateRecoveryInput({
        weekStartDate: document.getElementById('rec-week').value,
        sleep:         document.getElementById('rec-sleep').value,
        soreness:      document.getElementById('rec-soreness').value,
        stress:        document.getElementById('rec-stress').value,
        nutrition:     document.getElementById('rec-nutrition').value,
      });
      // Rate limit: 20 writes / 1 min per user — BEFORE Firestore write
      checkRateLimit('log recovery', writeKey('recovery', user.uid), LIMITS.write);
      const score = calculateRecoveryScore(validated.sleep, validated.soreness, validated.stress, validated.nutrition);
      await addRecoveryLog(user.uid, { ...validated, score });
      navigate('/recovery');
    } catch (err) {
      if (err.name === 'RateLimitError') showError('recovery-error', err.message);
      else if (err.name === 'ValidationError') showError('recovery-error', err.message);
      else showError('recovery-error', 'Failed to save. Please try again.');
    }
  });
}

function getWeekStart() { const d = new Date(); d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)); return d.toISOString().split('T')[0]; }
function fmtDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function showError(id, msg) { const el = document.getElementById(id); if (el) { el.textContent = msg; el.classList.add('visible'); } }
function hideError(id) { const el = document.getElementById(id); if (el) el.classList.remove('visible'); }
