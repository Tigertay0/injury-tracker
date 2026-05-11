// Dashboard — matches Stitch design: risk gauge, metric cards, ACWR chart, AI analysis, action plan
import { auth } from '../firebase.js';
import { renderAppShell } from '../components/app-shell.js';
import { getUserProfile, getSessions, getLatestRecovery, getInjuries } from '../lib/firestore.js';
import {
  calculateACWR, getACWRZone, getACWRRiskScore, calculateAcuteWorkload, calculateChronicWorkload,
  getRecoveryZone, getRecoveryRiskScore,
  getEquipmentRiskScore, calculateCompositeScore, getCompositeZone,
  getRiskColor, getRiskBadgeClass, getZoneLabel,
} from '../lib/calculations.js';
import { getEquipmentRisk } from '../lib/equipment-matrix.js';
import { generateRecommendations } from '../lib/recommendations.js';
import { navigate } from '../router.js';

// Escapes any HTML in Firestore-sourced strings before injecting into innerHTML
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export async function renderDashboard() {
  const user = auth.currentUser;
  if (!user) { navigate('/auth'); return; }

  renderAppShell(`<div class="loading-state"><div class="spinner"></div><p>Loading your risk data...</p></div>`);

  const [profile, sessions, latestRecovery, injuries] = await Promise.all([
    getUserProfile(user.uid),
    getSessions(user.uid),
    getLatestRecovery(user.uid),
    getInjuries(user.uid),
  ]);

  const acwr = calculateACWR(sessions);
  const acwrZone = getACWRZone(acwr);
  const acwrRisk = getACWRRiskScore(acwr);
  const acuteLoad = calculateAcuteWorkload(sessions);
  const chronicLoad = calculateChronicWorkload(sessions);

  const recoveryScore = latestRecovery?.score ?? null;
  const recoveryZone = recoveryScore !== null ? getRecoveryZone(recoveryScore) : 'N/A';
  const recoveryRisk = recoveryScore !== null ? getRecoveryRiskScore(recoveryScore) : 45;

  const equipmentRiskLevel = (profile?.cleatType && profile?.surfaceType)
    ? getEquipmentRisk(profile.cleatType, profile.surfaceType)
    : 'MEDIUM';
  const equipmentRisk = getEquipmentRiskScore(equipmentRiskLevel);

  const compositeScore = calculateCompositeScore(acwrRisk, recoveryRisk, equipmentRisk, injuries);
  const compositeZone = getCompositeZone(compositeScore);
  const dialColor = getRiskColor(compositeZone);

  const recs = generateRecommendations({
    acwr, acwrZone, recoveryScore, recoveryZone, equipmentRisk: equipmentRiskLevel,
    position: profile?.position || 'MID', injuries,
  });

  const circumference = 2 * Math.PI * 80;
  const fillPct = compositeScore / 100;
  const dashOffset = circumference * (1 - fillPct);

  // Recovery deficit text
  const recoveryText = recoveryScore === null
    ? 'No recovery data yet. Log your first check-in.'
    : recoveryZone === 'POOR' ? 'Sleep quality below baseline for 3 consecutive days.'
    : recoveryZone === 'MODERATE' ? 'Recovery metrics indicate moderate fatigue.'
    : 'Recovery metrics look good.';

  // AI Analysis text — acwr is a number from local calculations, safe to interpolate
  // recoveryZone is from a local function, safe. All branches are static strings.
  const aiText = acwr !== null && acwrZone === 'DANGER'
    ? `Your ACWR has spiked to ${Number(acwr)} following recent intense sessions. Combined with ${recoveryZone === 'POOR' ? 'a drop in recovery metrics' : 'current recovery levels'}, you are entering a high-risk window for soft tissue strain. Immediate load management is advised.`
    : acwr !== null && acwrZone === 'CAUTION'
    ? `Your ACWR is at ${Number(acwr)}, approaching the danger zone. Monitor recovery closely and avoid adding high-intensity sessions this week.`
    : acwr !== null
    ? `Your ACWR is at ${Number(acwr)}, within the optimal training zone. Maintain current load patterns and continue monitoring recovery metrics.`
    : 'Log at least 4 weeks of training data to receive AI-powered analysis of your injury risk patterns.';

  renderAppShell(`
    <div class="dashboard-header">
      <h1 class="type-page-title">DASHBOARD</h1>
      <div class="dashboard-actions">
        <a href="#/log-session" class="btn btn-primary">
          <span class="material-symbols-outlined">add</span>
          Log Session
        </a>
      </div>
    </div>

    <!-- Current Injury Risk -->
    <section class="dashboard-section">
      <h2 class="section-heading">
        <span class="material-symbols-outlined">shield</span>
        Current Injury Risk
      </h2>

      <div class="risk-overview-grid">
        <!-- Risk Gauge -->
        <div class="card risk-gauge-card">
          <div class="risk-dial">
            <svg class="risk-dial-svg" viewBox="0 0 200 200" width="220" height="220">
              <circle class="risk-dial-track" cx="100" cy="100" r="80" />
              <circle class="risk-dial-fill" cx="100" cy="100" r="80"
                stroke="${dialColor}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${dashOffset}"
                transform="rotate(-90 100 100)" />
              <text class="risk-dial-score" x="100" y="88">${compositeScore}</text>
              <text class="risk-dial-label" x="100" y="118">/ 100</text>
            </svg>
          </div>
          <span class="risk-badge risk-badge-lg ${getRiskBadgeClass(compositeZone)}">${getZoneLabel(compositeZone)}</span>
        </div>

        <!-- Metric Summary Cards -->
        <div class="metric-cards-col">
          <div class="metric-card">
            <div class="metric-card-icon" style="background:var(--risk-green-bg);color:var(--risk-green);">
              <span class="material-symbols-outlined">speed</span>
            </div>
            <div class="metric-card-body">
              <div class="metric-card-label">Training Load</div>
              <div class="metric-card-value">${acuteLoad} <span class="metric-card-unit">AU</span></div>
            </div>
            <span class="risk-badge ${getRiskBadgeClass(acwrZone)}">${getZoneLabel(acwrZone)}</span>
          </div>

          <div class="metric-card">
            <div class="metric-card-icon" style="background:${recoveryZone === 'POOR' ? 'var(--risk-red-bg)' : recoveryZone === 'MODERATE' ? 'var(--risk-yellow-bg)' : 'var(--risk-green-bg)'};color:${recoveryZone === 'POOR' ? 'var(--risk-red)' : recoveryZone === 'MODERATE' ? 'var(--risk-yellow)' : 'var(--risk-green)'};">
              <span class="material-symbols-outlined">hotel</span>
            </div>
            <div class="metric-card-body">
              <div class="metric-card-label">Recovery Deficit</div>
              <div class="metric-card-desc">${recoveryText}</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-card-icon" style="background:var(--risk-${equipmentRiskLevel === 'LOW' ? 'green' : equipmentRiskLevel === 'MEDIUM' ? 'yellow' : 'red'}-bg);color:var(--risk-${equipmentRiskLevel === 'LOW' ? 'green' : equipmentRiskLevel === 'MEDIUM' ? 'yellow' : 'red'});">
              <span class="material-symbols-outlined">fitness_center</span>
            </div>
            <div class="metric-card-body">
              <div class="metric-card-label">Equipment Status</div>
              <div class="metric-card-value">${profile?.cleatType ? escHtml(getZoneLabel(equipmentRiskLevel)) : 'Not Set'}</div>
            </div>
            ${profile?.cleatType ? `<span class="risk-badge ${getRiskBadgeClass(equipmentRiskLevel)}">${escHtml(getZoneLabel(equipmentRiskLevel))}</span>` : '<a href="#/equipment" class="btn btn-sm btn-secondary">Set Up</a>'}
          </div>
        </div>
      </div>
    </section>

    <!-- ACWR Section -->
    <section class="dashboard-section">
      <h2 class="section-heading">
        <span class="material-symbols-outlined">monitoring</span>
        Acute:Chronic Workload Ratio (ACWR)
      </h2>
      <div class="card acwr-chart-card">
        <div class="acwr-zones">
          <div class="acwr-zone-row">
            <span class="acwr-zone-label">Danger Zone</span>
            <div class="acwr-zone-bar acwr-zone-danger">
              <span>&gt; 1.5</span>
            </div>
          </div>
          <div class="acwr-zone-row">
            <span class="acwr-zone-label">Caution</span>
            <div class="acwr-zone-bar acwr-zone-caution">
              <span>1.3 - 1.5</span>
            </div>
          </div>
          <div class="acwr-zone-row">
            <span class="acwr-zone-label">Sweet Spot</span>
            <div class="acwr-zone-bar acwr-zone-sweet">
              <span>0.8 - 1.3</span>
            </div>
          </div>
          <div class="acwr-zone-row">
            <span class="acwr-zone-label">Undertraining</span>
            <div class="acwr-zone-bar acwr-zone-under">
              <span>&lt; 0.8</span>
            </div>
          </div>
        </div>
        <div class="acwr-current">
          <div class="acwr-value-display">
            <span class="type-label-xs">Your ACWR</span>
            <span class="acwr-big-value" style="color:${getRiskColor(acwrZone)};">${acwr !== null ? acwr : 'N/A'}</span>
          </div>
          <div class="acwr-details">
            <div class="acwr-detail-item">
              <span class="type-label-xs">Acute (7d)</span>
              <span>${acuteLoad} AU</span>
            </div>
            <div class="acwr-detail-item">
              <span class="type-label-xs">Chronic (28d avg)</span>
              <span>${Math.round(chronicLoad)} AU</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- AI Analysis -->
    <section class="dashboard-section">
      <h2 class="section-heading">
        <span class="material-symbols-outlined">psychology</span>
        PitchSafe AI Analysis
      </h2>
      <div class="card ai-analysis-card">
        <div class="ai-analysis-icon">
          <span class="material-symbols-outlined">smart_toy</span>
        </div>
        <p>${aiText}</p>
      </div>
    </section>

    <!-- Action Plan -->
    <section class="dashboard-section">
      <h2 class="section-heading">
        <span class="material-symbols-outlined">checklist</span>
        Action Plan
      </h2>
      <div class="action-plan-grid">
        ${recs.length === 0 ? '<p style="color:var(--on-surface-variant);">Log more data to receive personalized action items.</p>' : recs.map(r => `
          <div class="action-card">
            <div class="action-card-priority" style="background:${r.priority <= 1 ? 'var(--risk-red)' : r.priority === 2 ? 'var(--risk-yellow)' : 'var(--risk-green)'}"></div>
            <div class="action-card-body">
              <h4>${escHtml(String(r.category))}</h4>
              <p>${escHtml(String(r.text))}</p>
              ${r.citation ? `<span class="action-citation">${escHtml(String(r.citation))}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `);
}
