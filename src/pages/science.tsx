// Public methodology page (PRD 7 and 8): every formula, threshold, weight and source.
import { Link } from 'react-router';
import { EquipmentMatrix } from '@/components/equipment-matrix';

const SECTIONS = [
  { id: 'load', title: 'Training load' },
  { id: 'movement', title: 'Movement load' },
  { id: 'recovery', title: 'Recovery' },
  { id: 'equipment', title: 'Cleats and surface' },
  { id: 'history', title: 'Injury history' },
  { id: 'score', title: 'The risk score' },
  { id: 'advice', title: 'The advice' },
  { id: 'limits', title: 'Limitations' },
  { id: 'sources', title: 'Sources' },
];

const SOURCES = [
  'Hulin, B.T., Gabbett, T.J., Lawson, D.W., Caputi, P. & Sampson, J.A. (2016). The acute:chronic workload ratio predicts injury: high chronic workload may decrease injury risk in elite rugby league players. British Journal of Sports Medicine, 50(4), 231-236.',
  'Gabbett, T.J. (2016). The training-injury prevention paradox: should athletes be training smarter and harder? British Journal of Sports Medicine, 50(5), 273-280.',
  'Duhig, S., Shield, A.J., Opar, D., Gabbett, T.J., Ferguson, C. & Williams, M. (2016). Effect of high-speed running on hamstring strain injury risk. British Journal of Sports Medicine, 50(24), 1536-1540.',
  'Malone, S., Hughes, B., Doran, D.A., Collins, K. & Gabbett, T.J. (2019). Can the workload-injury relationship be moderated by improved strength, speed and repeated-sprint qualities? Journal of Science and Medicine in Sport, 22(1), 29-34.',
  'Livesay, G.A., Reda, D.R. & Nauman, E.A. (2006). Peak torque and rotational stiffness developed at the shoe-surface interface. The American Journal of Sports Medicine, 34(3), 415-422.',
  'Meyers, M.C. & Barnhill, B.S. (2004). Incidence, causes, and severity of high school football injuries on FieldTurf versus natural grass. The American Journal of Sports Medicine, 32(7), 1626-1638.',
  'Drew, M.K. & Finch, C.F. (2016). The relationship between training load and injury, illness and soreness: a systematic and literature review. Sports Medicine, 46(6), 861-883.',
  'Thomas, D.T., Erdman, K.A. & Burke, L.M. (2016). Position of the Academy of Nutrition and Dietetics, Dietitians of Canada, and the American College of Sports Medicine: Nutrition and Athletic Performance. Journal of the Academy of Nutrition and Dietetics, 116(3), 501-528.',
];

function Table({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-[var(--radius-panel)] border border-line">
      <table className="w-full min-w-[28rem] text-left text-small">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-sunken text-label font-semibold text-ink-2">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 ? 'bg-ground' : 'bg-surface'}>
              {r.map((c, j) => (
                <td key={j} className={`tnum px-4 py-2.5 ${j === 0 ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return <p className="tnum mt-4 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-body font-semibold text-ink">{children}</p>;
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-t border-line pt-10 pb-12 first:border-t-0 first:pt-0">
      <h2 id={`${id}-h`} className="font-display text-h2 font-bold text-ink">
        {title}
      </h2>
      <div className="mt-3 space-y-4 text-body text-ink-2 [&_strong]:font-semibold [&_strong]:text-ink">{children}</div>
    </section>
  );
}

export default function Science() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 pt-10 pb-20 sm:px-8 md:pt-16">
      <h1 className="max-w-3xl font-display text-[2.75rem] leading-[0.98] font-bold tracking-[-0.035em] text-ink sm:text-display-m">How PitchSafe works out your risk</h1>
      <p className="mt-5 max-w-2xl text-lead text-ink-2">
        Every number in the app comes from the rules on this page. Nothing is guessed by AI. The formulas come from published sports science; the weighting that combines them is PitchSafe's own and has not been clinically validated.
      </p>

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 border-l border-line">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-small text-ink-2 hover:border-accent hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="max-w-[44rem]">
          <Section id="load" title="Training load">
            <p>
              Each session gets a load: <strong>minutes × effort</strong>, where effort is how hard it felt from 1 (very easy) to 10 (all-out). This is the session-RPE method used across professional sport.
            </p>
            <Formula>ACWR = load in the last 7 days ÷ (load in the last 28 days ÷ 4)</Formula>
            <p>
              The acute:chronic workload ratio (ACWR) compares this week with your average week over the last four. A sudden jump above what your body is used to is linked to more soft-tissue injuries (Hulin et al., 2016; Gabbett, 2016).
            </p>
            <Table
              caption="ACWR zones and the risk points each adds"
              head={['Zone', 'ACWR', 'Risk points']}
              rows={[
                ['Undertraining', 'below 0.8', 40],
                ['Sweet spot', '0.8 to 1.3', 10],
                ['Caution', 'above 1.3 to 1.5', 50],
                ['Danger', 'above 1.5', 85],
              ]}
            />
            <p>
              The ratio needs a baseline, so it stays blank until your logged history covers <strong>four full weeks</strong>. Weeks without sessions count as zero, and dates are your own calendar days.
            </p>
          </Section>

          <Section id="movement" title="Movement load">
            <p>If you add drills to a session, PitchSafe also tracks what kind of work you did. Each drill has an estimated profile: how much of its time is sprinting, high-speed running, change of direction, jumping and landing, contact, and strength work.</p>
            <p>For each kind of movement, your minutes over the last 7 days are compared with your average week since you started logging drills, up to the last 4 weeks, the same way as the workload ratio. A kind of movement is only judged once you have logged drills in at least 3 of the last 4 weeks, with at least 5 minutes of it in an average week.</p>
            <Table
              caption="Movement load zones"
              head={['This week against your usual', 'Zone', 'Risk points']}
              rows={[
                ['Up to 1.3×', 'Normal', 0],
                ['Above 1.3× to 1.5×', 'Rising', 50],
                ['Above 1.5×', 'Spike', 85],
              ]}
            />
            <p>The training part of your score uses whichever is higher: your workload-ratio points or your biggest movement spike. Strength work is shown but never scored. Spikes in sprinting and high-speed running are linked to hamstring strains (Duhig et al., 2016).</p>
            <p>Limits: drill profiles are estimates, and the minutes are what you enter. Sessions without drills count as zero, so log drills consistently.</p>
          </Section>

          <Section id="recovery" title="Recovery">
            <p>Once a week you answer four questions. Each becomes a score out of 10 and the recovery score is their average.</p>
            <Formula>Recovery = (sleep score + (10 − soreness) + (10 − stress) + nutrition) ÷ 4</Formula>
            <Table
              caption="Sleep scores"
              head={['Average sleep per night', 'Sleep score']}
              rows={[
                ['8 hours or more', 10],
                ['7 to under 8 hours', 8],
                ['6 to under 7 hours', 5],
                ['Under 6 hours', 2],
              ]}
            />
            <Table
              caption="Recovery zones"
              head={['Recovery score', 'Zone', 'Risk points']}
              rows={[
                ['7 to 10', 'Good', 10],
                ['4 to 6.9', 'Moderate', 45],
                ['0 to 3.9', 'Poor', 80],
              ]}
            />
            <p>Only a check-in from the last two weeks counts. Without one, recovery is treated as moderate and the dashboard tells you so.</p>
          </Section>

          <Section id="equipment" title="Cleats and surface">
            <p>
              Studs that grip a surface too hard stop your foot from releasing when you twist. That rotational traction is a documented risk factor for knee ligament and ankle injuries, especially with firm-ground studs on artificial turf (Livesay et al., 2006; Meyers & Barnhill, 2004).
            </p>
            <EquipmentMatrix className="mt-5" />
            <p>
              Risk points: low 5, medium 40, high 75, very high 95. The indoor-court column is not in the original PitchSafe specification and follows the same traction reasoning. Without cleats set, equipment counts as medium.
            </p>
          </Section>

          <Section id="history" title="Injury history">
            <p>A previous injury is one of the strongest predictors of the next one. These factors raise your score. Each counts once, they add together, and the total is capped at double.</p>
            <Table
              caption="Injury history factors"
              head={['In your history', 'Adds']}
              rows={[
                ['Knee ligament tear (logged as a knee tear)', '+40%'],
                ['Injured, or returned from injury, in the last 6 weeks', '+30%'],
                ['Severe ankle sprain', '+25%'],
                ['Hamstring strain or tear', '+20%'],
              ]}
            />
          </Section>

          <Section id="score" title="The risk score">
            <Formula>Score = (load points × 0.45 + recovery points × 0.30 + equipment points × 0.25) × injury factor</Formula>
            <p>The result is  and capped at 100.</p>
            <Table
              caption="Risk score bands"
              head={['Score', 'Band']}
              rows={[
                ['0 to 30', 'Low risk'],
                ['31 to 59', 'Moderate risk'],
                ['60 to 79', 'High risk'],
                ['80 to 100', 'Very high risk'],
              ]}
            />
            <p>Each band is shown with a word and an icon as well as a colour.</p>
          </Section>

          <Section id="advice" title="The advice">
            <p>
              Recommendations are fixed rules, not AI. They depend on your load zone, movement spikes from your drills, recovery, equipment, injury history and position, and each cites its source where one applies. A very high equipment risk always comes first. Nutrition notes are general principles from the joint sports nutrition position stand (Thomas et al., 2016), not personal dietary advice.
            </p>
          </Section>

          <Section id="limits" title="Limitations">
            <p>
              <strong>The ACWR model is debated.</strong> Researchers have questioned how well a single ratio captures individual differences between athletes (Drew & Finch, 2016). PitchSafe uses it as a simple early warning, not a verdict.
            </p>
            <p>
              <strong>Your inputs are self-reported.</strong> Effort and recovery answers are subjective. <strong>Movement load comes from the drills you log, not sensors:</strong> PitchSafe cannot see how you actually run, land or cut. <strong>It has not been clinically validated</strong> against real injury outcomes.
            </p>
            <p>A clinical-grade tool would need wearable GPS and accelerometer data, video or motion-capture screening, links to team medical staff, a large long-term dataset of real injuries, and a validation study with sports medicine professionals.</p>
          </Section>

          <Section id="sources" title="Sources">
            <ol className="list-decimal space-y-3 pl-5 text-small marker:text-ink-3">
              {SOURCES.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </Section>

          <p className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 text-small text-ink-2">
            PitchSafe is an educational awareness tool, not a medical device or diagnostic service. If you feel pain or think you are injured, stop training and see a qualified medical professional or physiotherapist.{' '}
            <Link to="/use" className="font-semibold text-accent-ink underline underline-offset-2">
              Use our app
            </Link>
          </p>
        </article>
      </div>
    </div>
  );
}
