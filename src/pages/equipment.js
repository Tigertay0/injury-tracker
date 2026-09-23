// Equipment — with full input validation and rate limiting
import { auth } from '../firebase.js';
import { renderAppShell } from '../components/app-shell.js';
import { getUserProfile, updateUserProfile } from '../lib/firestore.js';
import { getEquipmentRisk, getEquipmentRiskExplanation, CLEAT_TYPES, SURFACE_TYPES } from '../lib/equipment-matrix.js';
import { getRiskBadgeClass, getZoneLabel } from '../lib/calculations.js';
import { validateEquipmentInput } from '../lib/validation.js';
import { checkRateLimit, LIMITS, writeKey } from '../lib/rate-limiter.js';
import { navigate } from '../router.js';
import { showError, hideError, LOAD_ERROR_HTML } from '../lib/dom.js';

const isElevatedRisk = (r) => r === 'HIGH' || r === 'VERY_HIGH';
const riskTitle = (r) => isElevatedRisk(r) ? 'High Risk Configuration' : r === 'LOW' ? 'Low Risk Configuration' : 'Compatibility Alert';

export async function renderEquipment() {
  const user = auth.currentUser;
  if (!user) { navigate('/auth'); return; }
  let profile;
  try {
    profile = await getUserProfile(user.uid);
  } catch (err) {
    console.error('[equipment] Failed to load profile:', err);
    renderAppShell(LOAD_ERROR_HTML);
    return;
  }
  const cc = profile?.cleatType || '';
  const cs = profile?.surfaceType || '';
  const risk = cc && cs ? getEquipmentRisk(cc, cs) : null;

  renderAppShell(`
    <div class="dashboard-header">
      <div>
        <h1 class="type-page-title">EQUIPMENT CONFIGURATION</h1>
        <p style="color:var(--on-surface-variant);margin-top:var(--space-xs);">Select your primary footwear and standard playing surface to analyze potential injury risks.</p>
      </div>
    </div>

    <div class="auth-error" id="equipment-error"></div>

    <div class="grid-2">
      <div class="card">
        <h2 class="card-title" style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-lg);">
          <span class="material-symbols-outlined" style="color:var(--primary);">footprint</span>
          Select Your Cleats
        </h2>
        <div class="flex-col gap-sm">
          ${CLEAT_TYPES.map(c => `
            <label class="equipment-radio-card ${cc === c.id ? 'selected' : ''}" data-cleat="${c.id}">
              <input type="radio" name="cleat" value="${c.id}" ${cc === c.id ? 'checked' : ''} />
              <div class="equipment-radio-body">
                <div class="type-label-sm">${c.name}</div>
                <div style="font-size:12px;color:var(--on-surface-variant);">${c.desc}</div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <h2 class="card-title" style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-lg);">
          <span class="material-symbols-outlined" style="color:var(--primary);">grass</span>
          Select Primary Surface
        </h2>
        <div class="flex-col gap-sm">
          ${SURFACE_TYPES.map(s => `
            <label class="equipment-radio-card ${cs === s.id ? 'selected' : ''}" data-surface="${s.id}">
              <input type="radio" name="surface" value="${s.id}" ${cs === s.id ? 'checked' : ''} />
              <div class="equipment-radio-body">
                <div class="type-label-sm">${s.name}</div>
                <div style="font-size:12px;color:var(--on-surface-variant);">${s.desc}</div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="card mt-lg" id="risk-result" ${!risk ? 'style="display:none;"' : ''}>
      <div style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-md);">
        <span class="material-symbols-outlined" style="color:${isElevatedRisk(risk) ? 'var(--risk-red)' : 'var(--primary)'};">warning</span>
        <h2 class="card-title" style="margin:0;" id="risk-title">${riskTitle(risk)}</h2>
        <span class="risk-badge ${risk ? getRiskBadgeClass(risk) : ''}" id="risk-badge-el">${risk ? getZoneLabel(risk) : ''}</span>
      </div>
      <p style="font-size:14px;line-height:1.7;color:var(--on-surface-variant);margin-bottom:var(--space-md);" id="risk-explanation">
        ${risk ? getEquipmentRiskExplanation(cc, cs, risk) : ''}
      </p>
      ${isElevatedRisk(risk) ? '<p style="font-size:13px;color:var(--primary);font-weight:600;">Switch to AG (Artificial Grass) or TF (Turf) specific footwear with shorter, conical studs to allow for safe rotational release.</p>' : ''}
    </div>

    <div class="card mt-lg" style="text-align:center;padding:var(--space-xl);">
      <span class="material-symbols-outlined" style="font-size:32px;color:var(--primary);margin-bottom:var(--space-sm);">check_circle</span>
      <h3 style="font-family:var(--font-headline);font-size:24px;letter-spacing:1px;margin-bottom:var(--space-sm);">Ready to track?</h3>
      <p style="font-size:14px;color:var(--on-surface-variant);">Saving this equipment profile will apply these baseline risk factors to your upcoming sessions.</p>
    </div>
  `);

  bindEquipmentOptions('cleat', 'cleatType', (v) => updateRisk(v, null));
  bindEquipmentOptions('surface', 'surfaceType', (v) => updateRisk(null, v));

  // Wires the radio cards for one equipment field. The selection is applied
  // optimistically and rolled back if the save fails.
  function bindEquipmentOptions(name, field, onSaved) {
    const cards = document.querySelectorAll(`[data-${name}]`);
    cards.forEach(el => {
      el.addEventListener('click', async (e) => {
        // Stop the label re-dispatching a click to its hidden radio (which ran this
        // handler twice); selectCard() owns the checked state instead
        e.preventDefault();
        const previous = document.querySelector(`[data-${name}].selected`);
        if (el === previous) return;
        hideError('equipment-error');
        try {
          const validated = validateEquipmentInput({ [field]: el.dataset[name] });
          // Rate limit: 20 writes / 1 min per user — BEFORE Firestore write
          checkRateLimit('update equipment', writeKey('equipment', user.uid), LIMITS.write);
          selectCard(cards, el);
          await updateUserProfile(user.uid, validated);
          onSaved(validated[field]);
        } catch (err) {
          selectCard(cards, previous);
          if (err.name === 'RateLimitError') showError('equipment-error', err.message);
          // Tampered data attributes are rejected by the allowlist — nothing to report
          else if (err.name !== 'ValidationError') {
            console.error('[equipment] Failed to save equipment:', err);
            showError('equipment-error', 'Failed to save equipment. Please try again.');
          }
        }
      });
    });
  }

  function selectCard(cards, selected) {
    cards.forEach(l => {
      l.classList.toggle('selected', l === selected);
      l.querySelector('input').checked = l === selected;
    });
  }

  function updateRisk(nc, ns) {
    const c = nc || document.querySelector('[name="cleat"]:checked')?.value;
    const s = ns || document.querySelector('[name="surface"]:checked')?.value;
    if (!c || !s) return;
    const r = getEquipmentRisk(c, s);
    document.getElementById('risk-result').style.display = '';
    document.getElementById('risk-badge-el').className = `risk-badge ${getRiskBadgeClass(r)}`;
    document.getElementById('risk-badge-el').textContent = getZoneLabel(r);
    document.getElementById('risk-explanation').textContent = getEquipmentRiskExplanation(c, s, r);
    document.getElementById('risk-title').textContent = riskTitle(r);
  }
}
