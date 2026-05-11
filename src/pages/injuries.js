// Injury History — with full input validation and rate limiting
import { auth } from '../firebase.js';
import { renderAppShell } from '../components/app-shell.js';
import { addInjury, getInjuries, deleteInjury } from '../lib/firestore.js';
import { calculateInjuryMultiplier } from '../lib/calculations.js';
import { validateInjuryInput, requireFirestoreId, ValidationError } from '../lib/validation.js';
import { checkRateLimit, LIMITS, RateLimitError, writeKey, deleteKey } from '../lib/rate-limiter.js';
import { navigate } from '../router.js';

// Re-export arrays for the template (sourced from validation allowlists)
const BODY_PARTS_LIST = [
  'Head','Neck','Shoulder (L)','Shoulder (R)','Knee (L)','Knee (R)',
  'Ankle (L)','Ankle (R)','Hamstring (L)','Hamstring (R)','Quadriceps (L)','Quadriceps (R)',
  'Calf (L)','Calf (R)','Groin','Hip (L)','Hip (R)','Lower Back',
  'Wrist (L)','Wrist (R)','Foot (L)','Foot (R)',
];
const INJURY_TYPES_LIST = ['Strain','Sprain','Fracture','Tear','Contusion','Other'];

export async function renderInjuries() {
  const user = auth.currentUser;
  if (!user) { navigate('/auth'); return; }
  const injuries = await getInjuries(user.uid);
  const multiplier = calculateInjuryMultiplier(injuries);
  const riskIncrease = Math.round((multiplier - 1) * 100);

  renderAppShell(`
    <h1 class="type-page-title" style="margin-bottom:var(--space-lg);">INJURY HISTORY</h1>

    <div class="grid-2">
      <div class="flex-col" style="gap:var(--space-lg);">
        <div class="card">
          <h2 class="card-title" style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-lg);">
            <span class="material-symbols-outlined" style="color:var(--primary);">monitor_heart</span>
            History Log
          </h2>
          ${injuries.length === 0 ? '<div class="empty-state"><p>No injuries logged. That\'s great!</p></div>' : `
            <div class="flex-col gap-sm">
              ${injuries.map(inj => `
                <div class="injury-entry">
                  <div class="injury-date">${fmtDate(inj.injuryDate)}</div>
                  <div class="injury-details">
                    <div class="injury-title">${escHtml(String(inj.bodyPart))} ${escHtml(String(inj.injuryType))}</div>
                    <div class="injury-meta">
                      <span style="text-transform:capitalize;">${escHtml(String(inj.severity))}</span>
                      ${inj.returnDate ? `<span style="color:var(--risk-green);">· Returned ${fmtDate(inj.returnDate)}</span>` : '<span style="color:var(--risk-orange);">· Still recovering</span>'}
                    </div>
                  </div>
                  <button class="btn btn-sm btn-secondary delete-injury" data-id="${escAttr(inj.id)}" style="height:32px;font-size:14px;padding:0 8px;">
                    <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="card ai-analysis-card">
          <div class="ai-analysis-icon">
            <span class="material-symbols-outlined">psychology</span>
          </div>
          <div>
            <h3 style="font-size:14px;font-weight:700;margin-bottom:var(--space-xs);">Risk Impact</h3>
            <p style="font-size:14px;line-height:1.6;">
              ${injuries.length === 0 ? 'No injury history to factor into your risk score.' :
              `Your history ${injuries.some(i => typeof i.bodyPart === 'string' && i.bodyPart.toLowerCase().includes('hamstring')) ? 'of hamstring strains increases' : 'increases'} your baseline risk score by +${riskIncrease}% during high-sprint load sessions. ${riskIncrease > 20 ? 'Strongly recommended to prioritize eccentric strengthening protocols.' : 'Recommended to maintain preventive warm-up routines.'}`}
            </p>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="card-title" style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-lg);">
          <span class="material-symbols-outlined" style="color:var(--primary);">add_circle</span>
          Log New Injury
        </h2>
        <div class="auth-error" id="injury-error"></div>
        <form id="injury-form" class="flex-col">
          <div class="form-group">
            <label class="form-label" for="inj-body">Body Part</label>
            <select class="form-input" id="inj-body" required>
              <option value="">Select body part</option>
              ${BODY_PARTS_LIST.map(p => `<option value="${escAttr(p)}">${escHtml(p)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="inj-type">Injury Type</label>
            <select class="form-input" id="inj-type" required>
              <option value="">Select type</option>
              ${INJURY_TYPES_LIST.map(t => `<option value="${escAttr(t)}">${escHtml(t)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="inj-severity">Severity</label>
            <select class="form-input" id="inj-severity" required>
              <option value="">Select severity</option>
              <option value="mild">Mild (&lt; 1 week)</option>
              <option value="moderate">Moderate (1-4 weeks)</option>
              <option value="severe">Severe (&gt; 4 weeks)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="inj-date">Date of Injury</label>
            <input class="form-input" type="date" id="inj-date" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="inj-return">Return Date (optional)</label>
            <input class="form-input" type="date" id="inj-return" />
          </div>
          <button type="submit" class="btn btn-primary w-full mt-md">
            <span class="material-symbols-outlined">save</span>
            LOG INJURY
          </button>
        </form>
      </div>
    </div>
  `);

  document.getElementById('injury-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('injury-error');
    try {
      const validated = validateInjuryInput({
        bodyPart:   document.getElementById('inj-body').value,
        injuryType: document.getElementById('inj-type').value,
        severity:   document.getElementById('inj-severity').value,
        injuryDate: document.getElementById('inj-date').value,
        returnDate: document.getElementById('inj-return').value || null,
      });
      // Rate limit: 20 writes / 1 min per user — BEFORE Firestore write
      checkRateLimit('log injury', writeKey('injury', user.uid), LIMITS.write);
      await addInjury(user.uid, validated);
      navigate('/injuries');
    } catch (err) {
      if (err.name === 'RateLimitError') showError('injury-error', err.message);
      else if (err.name === 'ValidationError') showError('injury-error', err.message);
      else showError('injury-error', 'Failed to save injury. Please try again.');
    }
  });

  document.querySelectorAll('.delete-injury').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const id = requireFirestoreId(btn.dataset.id, 'injury ID');
        // Rate limit: 10 deletes / 1 min per user — BEFORE Firestore delete
        checkRateLimit('delete injury', deleteKey('injury', user.uid), LIMITS.delete);
        await deleteInjury(user.uid, id);
        navigate('/injuries');
      } catch (err) {
        if (err.name === 'RateLimitError') showError('injury-error', err.message);
        // Silently ignore tampered IDs — Firestore security rules block them anyway
      }
    });
  });
}

function fmtDate(d) { if(!d) return ''; return new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
function escHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showError(id, msg) { const el = document.getElementById(id); if (el) { el.textContent = msg; el.classList.add('visible'); } }
function hideError(id) { const el = document.getElementById(id); if (el) el.classList.remove('visible'); }
