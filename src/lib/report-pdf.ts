// One-page coach report (PRD 2.8), generated on the device so no health data is sent
// anywhere new. Loaded on demand from the dashboard.
import { jsPDF } from 'jspdf';
import { calculateACWR } from '@shared/calculations';
import { addDays } from '@shared/dates';
import { cleatName, surfaceName } from '@shared/equipment';
import type { RiskModel } from '@shared/risk-model';
import type { Overview } from './player-data';
import { ACWR_LABEL, COMPOSITE_LABEL, EQUIPMENT_LABEL, POSITION_LABEL, RECOVERY_LABEL, fmtDate } from './labels';

// PDF colours mirror the light theme tokens (a PDF cannot read CSS variables)
const INK: [number, number, number] = [27, 31, 38];
const INK_2: [number, number, number] = [86, 92, 102];
const LINE: [number, number, number] = [220, 223, 228];
const ACCENT: [number, number, number] = [35, 88, 205];
const PAST: [number, number, number] = [123, 152, 214];
const ZONE_RGB: Record<string, [number, number, number]> = {
  LOW: [36, 122, 72],
  MODERATE: [135, 98, 0],
  HIGH: [182, 84, 26],
  VERY_HIGH: [180, 43, 34],
};

const FACTOR_LABEL: Record<string, string> = {
  ACL_HISTORY: 'past knee ligament tear',
  ANKLE_SPRAIN_HISTORY: 'past severe ankle sprain',
  HAMSTRING_HISTORY: 'past hamstring strain',
  RECENT_INJURY: 'injury in the last 6 weeks',
};

const DISCLAIMER =
  'PitchSafe is an educational awareness tool, not a medical device or diagnostic service. Scores are based on self-reported data and published sports science models: they are indicators, not guarantees. If the player feels pain or may be injured, they should stop training and see a qualified medical professional or physiotherapist.';

const METHOD =
  'Method: session load = minutes x effort (1-10). ACWR = last 7 days of load / average weekly load over 28 days (Hulin et al., 2016; Gabbett, 2016). Recovery = average of sleep, soreness, stress and nutrition scores (0-10). Composite = 45% load + 30% recovery + 25% equipment, multiplied by injury-history factors (max 2x).';

export async function downloadCoachReport(overview: Overview, model: RiskModel): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = 18;
  const right = 192;
  let y = 20;

  const text = (s: string, x: number, size: number, color = INK, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(s, x, y);
  };
  const wrapped = (s: string, size: number, color = INK_2, width = right - left) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(s, width) as string[];
    doc.text(lines, left, y);
    y += lines.length * size * 0.42;
  };
  const rule = () => {
    doc.setDrawColor(...LINE);
    doc.line(left, y, right, y);
  };

  // Header
  text('PitchSafe coach report', left, 18, INK, 'bold');
  y += 7;
  const profile = overview.profile;
  const who = [profile?.displayName || 'Player', profile?.position ? POSITION_LABEL[profile.position] : null].filter(Boolean).join(', ');
  text(`${who}. Generated ${fmtDate(model.today, true)}.`, left, 10, INK_2);
  y += 6;
  rule();
  y += 12;

  // Score
  if (model.composite) {
    const color = ZONE_RGB[model.composite.zone];
    text(String(model.composite.score), left, 34, color, 'bold');
    text('/ 100', left + (model.composite.score >= 10 ? 21 : 12), 12, INK_2);
    y -= 7;
    text(`Injury risk score: ${COMPOSITE_LABEL[model.composite.zone]}`, left + 50, 13, INK, 'bold');
    y += 7;
  } else {
    text(`Baseline in progress: day ${model.baseline.daysCovered} of 28`, left, 15, INK, 'bold');
    y += 6;
    wrapped('A full risk score needs four weeks of logged sessions. The values below are already valid.', 10);
  }
  y += 8;

  // Metrics table
  const rows: [string, string][] = [
    ['Workload ratio (ACWR)', model.acwr === null ? 'Not enough data yet' : `${model.acwr.toFixed(2)} (${ACWR_LABEL[model.acwrZone]})`],
    ['Load this week / average week', `${model.acute.toLocaleString('en-US')} / ${model.chronic.toLocaleString('en-US')}`],
    ['Recovery score', model.recovery ? `${model.recovery.score.toFixed(1)} / 10 (${RECOVERY_LABEL[model.recoveryZone!]}), week of ${fmtDate(model.recovery.weekStart)}` : 'No check-in in the last two weeks'],
    ['Cleats and surface', profile?.cleatType ? `${cleatName(profile.cleatType)} on ${surfaceName(profile.surfaceType).toLowerCase()}` : 'Not set'],
    ['Equipment risk', model.equipmentRisk ? EQUIPMENT_LABEL[model.equipmentRisk] : 'Not set'],
    ['Injury history factor', model.injury.value > 1 ? `x${model.injury.value.toFixed(2)} (${model.injury.factors.map((f) => FACTOR_LABEL[f]).join(', ')})` : 'None'],
  ];
  for (const [label, value] of rows) {
    text(label, left, 10, INK_2);
    doc.setFont('helvetica', 'bold');
    const lines = doc.splitTextToSize(value, 100) as string[];
    doc.setTextColor(...INK);
    doc.text(lines, 88, y);
    y += Math.max(1, lines.length) * 4.6 + 2.4;
  }
  y += 4;
  rule();
  y += 9;

  // 28-day load chart with weekly ACWR points
  text('Training load, last 28 days', left, 12, INK, 'bold');
  y += 4;
  const chartH = 36;
  const chartW = right - left;
  const max = Math.max(...model.days.map((d) => d.load), 1);
  const slot = chartW / model.days.length;
  const base = y + chartH;
  model.days.forEach((d, i) => {
    if (d.load <= 0) return;
    const h = (d.load / max) * chartH;
    doc.setFillColor(...(i >= 21 ? ACCENT : PAST));
    doc.rect(left + i * slot + slot * 0.18, base - h, slot * 0.64, h, 'F');
  });
  doc.setDrawColor(...LINE);
  doc.line(left, base, right, base);
  y = base + 5;
  text(fmtDate(model.days[0].date), left, 8, INK_2);
  doc.text(fmtDate(model.days[model.days.length - 1].date), right, y, { align: 'right' });
  y += 7;

  const weekly = [21, 14, 7, 0].map((back) => {
    const day = addDays(model.today, -back);
    const value = calculateACWR(overview.sessions, day);
    return `${fmtDate(day)}: ${value === null ? 'n/a' : value.toFixed(2)}`;
  });
  wrapped(`Weekly ACWR, oldest first. ${weekly.join('   ')}`, 9);
  y += 4;
  rule();
  y += 9;

  // Top actions
  text('Top actions', left, 12, INK, 'bold');
  y += 6;
  model.recommendations.slice(0, 3).forEach((r, i) => {
    wrapped(`${i + 1}. ${r.text}${r.citation ? ` (${r.citation})` : ''}`, 10, INK);
    y += 2;
  });
  y += 4;
  rule();
  y += 8;

  wrapped(METHOD, 8.5);
  y += 3;
  wrapped(DISCLAIMER, 8.5);

  doc.save(`pitchsafe-report-${model.today}.pdf`);
}
