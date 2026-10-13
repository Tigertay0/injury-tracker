// Dashboard: verdict first (one big number, one sentence, one action), then the
// four inputs behind it, the load chart, and everything else in order of urgency.
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Bed, FilePdf, FirstAidKit, Plus, SneakerMove, Timer, WarningOctagon, type Icon } from '@phosphor-icons/react';
import { buildRiskModel, type RiskModel } from '@shared/risk-model';
import { localToday } from '@shared/dates';
import { MOVEMENT_LABEL } from '@shared/movement';
import { FUEL_DISCLAIMER, type RecommendationCategory } from '@shared/recommendations';
import { LoadChart } from '@/components/load-chart';
import { RiskChip } from '@/components/risk-chip';
import { Button } from '@/components/ui/button';
import {
  ACWR_LABEL,
  ACWR_MEANING,
  ACWR_TONE,
  COMPOSITE_LABEL,
  COMPOSITE_TONE,
  COMPOSITE_VERDICT,
  EQUIPMENT_LABEL,
  EQUIPMENT_TONE,
  RECOVERY_LABEL,
  RECOVERY_TONE,
  TONE_TEXT,
  type Tone,
} from '@/lib/labels';
import { useAppBase, useOverview } from '@/lib/player-data';
import { cn } from '@/lib/utils';
import { LEVEL_CHIP, MovementPanel } from './movement-panel';
import { PageHeader } from './page-header';

/** Where each kind of advice can be acted on, and what the link says. */
const NEXT_STEP: Record<RecommendationCategory, { path: string; label: string }> = {
  'Training load': { path: '/log', label: 'Log a session' },
  Recovery: { path: '/recovery', label: 'Do your recovery check-in' },
  Equipment: { path: '/equipment', label: 'Check your cleats' },
  'Injury history': { path: '/injuries', label: 'Review your injuries' },
  Position: { path: '/settings', label: 'Check your position' },
};

export const DISCLAIMER =
  'PitchSafe is an educational awareness tool, not a medical device or diagnostic service. Risk scores come from self-reported data and published sports science models. They are indicators, not guarantees, and individual risk depends on things this tool cannot measure. If you feel pain or think you are injured, stop training and see a qualified medical professional or physiotherapist.';

function Verdict({ model, hasSessions }: { model: RiskModel; hasSessions: boolean }) {
  const base = useAppBase();
  if (model.composite) {
    const { score, zone } = model.composite;
    const top = model.recommendations[0];
    return (
      <section aria-labelledby="verdict-title" className="grid gap-6 rounded-[var(--radius-panel)] border border-line bg-surface p-6 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10 md:p-8">
        <div>
          <h2 id="verdict-title" className="text-label font-semibold text-ink-2">
            Injury risk score
          </h2>
          <p className="mt-1 flex items-baseline gap-2">
            <span className={cn('tnum font-display text-score font-bold', TONE_TEXT[COMPOSITE_TONE[zone]])}>{score}</span>
            <span className="tnum text-lead font-semibold text-ink-3">/ 100</span>
          </p>
          <RiskChip tone={COMPOSITE_TONE[zone]} className="mt-3">
            {COMPOSITE_LABEL[zone]}
          </RiskChip>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <p className="text-lead font-semibold text-ink">{COMPOSITE_VERDICT[zone]}</p>
          {top && (
            <div className={cn('rounded-[var(--radius-control)] p-4', top.urgent ? 'bg-risk-very-high-soft' : 'bg-sunken')}>
              <p className={cn('text-label font-semibold', top.urgent ? 'text-risk-very-high' : 'text-ink-2')}>Do this first</p>
              <p className="mt-1 text-body text-ink">{top.text}</p>
            </div>
          )}
          {model.assumptions.length > 0 && (
            <p className="text-label text-ink-2">
              {model.assumptions.includes('NO_RECENT_CHECKIN') && (
                <>
                  No check-in in the last two weeks, so recovery is counted as moderate.{' '}
                  <Link to={`${base}/recovery`} className="font-semibold text-accent-ink underline underline-offset-2">
                    Do this week's check-in
                  </Link>
                  .{' '}
                </>
              )}
              {model.assumptions.includes('NO_EQUIPMENT') && (
                <>
                  Cleats not set, so equipment is counted as medium risk.{' '}
                  <Link to={`${base}/equipment`} className="font-semibold text-accent-ink underline underline-offset-2">
                    Set your cleats
                  </Link>
                  .
                </>
              )}
            </p>
          )}
        </div>
      </section>
    );
  }

  if (!hasSessions) {
    return (
      <section className="rounded-[var(--radius-panel)] border border-line bg-surface p-6 md:p-8">
        <h2 className="font-display text-h2 font-bold text-ink">Log your first session</h2>
        <p className="mt-2 max-w-lg text-body text-ink-2">
          Every session counts, easy ones included. After four weeks of logging you get your full risk score. Your cleat and recovery checks work today.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to={`${base}/log`}>
            <Plus aria-hidden weight="bold" />
            Log a session
          </Link>
        </Button>
      </section>
    );
  }

  const { daysCovered } = model.baseline;
  const pct = Math.round((daysCovered / 28) * 100);
  return (
    <section aria-labelledby="baseline-title" className="rounded-[var(--radius-panel)] border border-line bg-surface p-6 md:p-8">
      <h2 id="baseline-title" className="text-label font-semibold text-ink-2">
        Building your baseline
      </h2>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="tnum font-display text-display-m font-bold text-ink">Day {daysCovered}</span>
        <span className="tnum text-lead font-semibold text-ink-3">of 28</span>
      </p>
      <div
        className="mt-4 h-2.5 max-w-md overflow-hidden bg-accent-soft"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={28}
        aria-valuenow={daysCovered}
        aria-label="Days of training history"
      >
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-4 max-w-xl text-body text-ink-2">
        Your risk score needs four weeks of history to know what normal looks like for you. Keep logging every session. Your cleat and recovery checks below already count.
      </p>
    </section>
  );
}

interface TileProps {
  to: string;
  icon: Icon;
  label: string;
  value: string;
  tone: Tone;
  status: string;
}

function Tile({ to, icon: Icon, label, value, tone, status }: TileProps) {
  return (
    <Link to={to} className="press group flex min-w-0 flex-col gap-2 rounded-[var(--radius-panel)] border border-line bg-surface p-4 hover:border-line-strong">
      <span className="flex items-center gap-2 text-label font-semibold text-ink-2">
        <Icon aria-hidden className="size-4" />
        {label}
      </span>
      <span className="tnum truncate font-display text-h2 font-bold text-ink">{value}</span>
      <RiskChip tone={tone} className="self-start">
        {status}
      </RiskChip>
    </Link>
  );
}

/** The ratio value stays; the chip names the movement spike when that, not the ratio, set the training part of the score. */
function workloadChip(model: RiskModel): { tone: Tone; status: string } {
  const worst = model.movement.worst;
  const chip = worst ? LEVEL_CHIP[worst.level] : undefined;
  if (model.trainingInput.source === 'movement' && worst && chip) return { tone: chip.tone, status: `${MOVEMENT_LABEL[worst.type]} ${chip.text.toLowerCase()}` };
  return { tone: ACWR_TONE[model.acwrZone], status: ACWR_LABEL[model.acwrZone] };
}

function ReportButton({ model }: { model: RiskModel }) {
  const overview = useOverview();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div>
      <Button
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          try {
            const { downloadCoachReport } = await import('@/lib/report-pdf');
            await downloadCoachReport(overview, model);
          } catch (err) {
            console.error('[report] PDF failed', err);
            setFailed(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        <FilePdf aria-hidden />
        {busy ? 'Building PDF…' : 'Download coach report'}
      </Button>
      {failed && (
        <p role="alert" className="mt-2 text-label text-risk-very-high">
          The report could not be built. Try again.
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const overview = useOverview();
  const base = useAppBase();
  const today = useMemo(() => localToday(), []);
  const model = useMemo(() => buildRiskModel(overview, today), [overview, today]);
  const name = overview.profile?.displayName;
  const thisWeek = model.acute;
  const avgWeek = model.chronic;
  const workload = workloadChip(model);

  return (
    <>
      <PageHeader
        title={name ? `Hi ${name}` : 'Your risk today'}
        description={new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}
        action={
          <Button asChild className="hidden lg:inline-flex">
            <Link to={`${base}/log`}>
              <Plus aria-hidden weight="bold" />
              Log session
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <Verdict model={model} hasSessions={overview.sessions.length > 0} />

        <section aria-label="What makes up your score" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile to={`${base}/log`} icon={Timer} label="Workload ratio" value={model.acwr === null ? 'N/A' : model.acwr.toFixed(2)} tone={workload.tone} status={workload.status} />
          <Tile
            to={`${base}/recovery`}
            icon={Bed}
            label="Recovery"
            value={model.recovery ? `${model.recovery.score.toFixed(1)}` : 'N/A'}
            tone={model.recoveryZone ? RECOVERY_TONE[model.recoveryZone] : 'neutral'}
            status={model.recoveryZone ? RECOVERY_LABEL[model.recoveryZone] : 'No check-in'}
          />
          <Tile
            to={`${base}/equipment`}
            icon={SneakerMove}
            label="Cleats"
            value={model.equipmentRisk ? EQUIPMENT_LABEL[model.equipmentRisk].replace(' risk', '') : 'N/A'}
            tone={model.equipmentRisk ? EQUIPMENT_TONE[model.equipmentRisk] : 'neutral'}
            status={model.equipmentRisk ? EQUIPMENT_LABEL[model.equipmentRisk] : 'Not set'}
          />
          <Tile
            to={`${base}/injuries`}
            icon={FirstAidKit}
            label="Injury history"
            value={`×${model.injury.value.toFixed(2)}`}
            tone={model.injury.value >= 1.3 ? 'high' : model.injury.value > 1 ? 'moderate' : 'low'}
            status={model.injury.value > 1 ? 'Raises score' : 'No extra risk'}
          />
        </section>

        <section aria-labelledby="load-title" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="load-title" className="text-lead font-semibold text-ink">
              Training load, last 28 days
            </h2>
            <p className="tnum text-small text-ink-2">
              This week {thisWeek.toLocaleString('en-US')} · average week {avgWeek.toLocaleString('en-US')}
            </p>
          </div>
          <p className="mt-1 text-small text-ink-2">{ACWR_MEANING[model.acwrZone]}</p>
          <LoadChart className="mt-5" days={model.days} highlightFrom={21} referenceDaily={avgWeek / 7} title="Your daily training load over the last 28 days" />
        </section>

        <MovementPanel movement={model.movement} />

        {model.recommendations.length > 0 && (
          <section aria-labelledby="actions-title">
            <h2 id="actions-title" className="mb-3 text-lead font-semibold text-ink">
              What to do now
            </h2>
            <ol className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface">
              {model.recommendations.map((r) => {
                const next = NEXT_STEP[r.category];
                return (
                  <li key={r.text} className="border-b border-line last:border-b-0">
                    {/* The whole row opens the screen where the player can act on it */}
                    <Link
                      to={`${base}${next.path}`}
                      className={cn(
                        'group flex gap-4 p-4 transition-colors duration-150 ease-out hover:bg-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus md:px-6',
                        r.urgent && 'bg-risk-very-high-soft hover:bg-risk-very-high-soft',
                      )}
                    >
                      {r.urgent && <WarningOctagon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0 text-risk-very-high" />}
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-label font-semibold', r.urgent ? 'text-risk-very-high' : 'text-ink-2')}>
                          {r.urgent ? 'Urgent: ' : ''}
                          {r.category}
                        </p>
                        <p className="mt-0.5 text-body text-ink">{r.text}</p>
                        {r.citation && <p className="mt-1 text-label text-ink-3">Source: {r.citation}</p>}
                        <p className="mt-2 inline-flex items-center gap-1 text-small font-semibold text-accent-ink">
                          {next.label}
                          <ArrowRight aria-hidden weight="bold" className="size-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {model.fuel.length > 0 && (
          <section aria-labelledby="fuel-title" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
            <h2 id="fuel-title" className="text-lead font-semibold text-ink">
              Fuel and recovery
            </h2>
            <p className="mt-2 rounded-[var(--radius-control)] bg-sunken p-3 text-label text-ink-2">{FUEL_DISCLAIMER}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {model.fuel.map((f) => (
                <div key={f.id}>
                  <p className="text-body font-semibold text-ink">{f.title}</p>
                  <p className="mt-1 text-body text-ink-2">{f.text}</p>
                  <p className="mt-1 text-label text-ink-3">Source: {f.citation}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="report-title" className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
          <div className="max-w-lg">
            <h2 id="report-title" className="text-lead font-semibold text-ink">
              Coach report
            </h2>
            <p className="mt-1 text-body text-ink-2">A one-page PDF with your score, load trend, recovery, cleats and top actions. It is made on your device.</p>
          </div>
          <ReportButton model={model} />
        </section>

        <p className="text-label text-ink-3">{DISCLAIMER}</p>
        <Link to="/science" className="-mt-3 inline-flex items-center gap-1 self-start text-label font-semibold text-accent-ink underline-offset-2 hover:underline">
          How the score is calculated
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </>
  );
}
