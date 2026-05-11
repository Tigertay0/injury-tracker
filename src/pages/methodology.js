// Research & Methodology — matches Stitch design
import { renderAppShell } from '../components/app-shell.js';
import { auth } from '../firebase.js';
import { navigate } from '../router.js';

export async function renderMethodology() {
  if (!auth.currentUser) { navigate('/auth'); return; }

  renderAppShell(`
    <h1 class="type-page-title" style="margin-bottom:var(--space-sm);">RESEARCH & METHODOLOGY</h1>
    <p style="color:var(--on-surface-variant);margin-bottom:var(--space-xl);">PitchSafe utilizes an algorithmic approach to injury risk stratification based on current sports science literature, primarily focusing on workload ratios and recovery metrics.</p>

    <!-- How We Calculate Risk -->
    <section class="dashboard-section">
      <h2 class="section-heading">
        <span class="material-symbols-outlined">calculate</span>
        How We Calculate Risk
      </h2>
      <div class="grid-3">
        <div class="card">
          <div class="metric-card-icon" style="background:var(--risk-green-bg);color:var(--risk-green);margin-bottom:var(--space-md);">
            <span class="material-symbols-outlined">speed</span>
          </div>
          <h3 style="font-family:var(--font-headline);font-size:22px;letter-spacing:0.5px;margin-bottom:var(--space-sm);">ACWR</h3>
          <p style="font-size:14px;color:var(--on-surface-variant);line-height:1.6;">Acute:Chronic Workload Ratio compares recent training load to historical load to identify dangerous spikes.</p>
          <div class="card mt-md" style="background:var(--surface-container);box-shadow:none;padding:var(--space-md);">
            <code style="font-size:13px;">Session Load = Duration × RPE<br/>ACWR = Acute (7d) / Chronic (28d avg)</code>
          </div>
        </div>
        <div class="card">
          <div class="metric-card-icon" style="background:var(--risk-yellow-bg);color:var(--risk-yellow);margin-bottom:var(--space-md);">
            <span class="material-symbols-outlined">hotel</span>
          </div>
          <h3 style="font-family:var(--font-headline);font-size:22px;letter-spacing:0.5px;margin-bottom:var(--space-sm);">RECOVERY</h3>
          <p style="font-size:14px;color:var(--on-surface-variant);line-height:1.6;">Sleep quality, subjective soreness, and hydration levels compound to assess systemic readiness.</p>
        </div>
        <div class="card">
          <div class="metric-card-icon" style="background:var(--risk-orange-bg);color:var(--risk-orange);margin-bottom:var(--space-md);">
            <span class="material-symbols-outlined">fitness_center</span>
          </div>
          <h3 style="font-family:var(--font-headline);font-size:22px;letter-spacing:0.5px;margin-bottom:var(--space-sm);">EQUIPMENT</h3>
          <p style="font-size:14px;color:var(--on-surface-variant);line-height:1.6;">Tracking boot mileage and stud patterns against pitch surface types to mitigate biomechanical stress.</p>
        </div>
      </div>
    </section>

    <!-- Our Limitations -->
    <section class="dashboard-section">
      <h2 class="section-heading">
        <span class="material-symbols-outlined" style="color:var(--risk-red);">error</span>
        Our Limitations
      </h2>
      <div class="card">
        <p style="font-size:14px;line-height:1.7;color:var(--on-surface-variant);margin-bottom:var(--space-md);">PitchSafe is a tool for amateur monitoring, not a clinical diagnostic device. Our models rely heavily on subjective user input (RPE) which can introduce bias. We cannot account for contact injuries or acute traumatic events.</p>
        <div class="flex-col gap-sm">
          <div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm) var(--space-md);background:var(--surface-container-low);border-radius:var(--radius-default);">
            <span class="material-symbols-outlined" style="font-size:18px;color:var(--risk-orange);">warning</span>
            <span style="font-size:14px;">Subjective RPE reporting</span>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm) var(--space-md);background:var(--surface-container-low);border-radius:var(--radius-default);">
            <span class="material-symbols-outlined" style="font-size:18px;color:var(--risk-orange);">warning</span>
            <span style="font-size:14px;">Lack of GPS micro-movement data</span>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm) var(--space-md);background:var(--surface-container-low);border-radius:var(--radius-default);">
            <span class="material-symbols-outlined" style="font-size:18px;color:var(--risk-orange);">warning</span>
            <span style="font-size:14px;">Unpredictable contact injuries</span>
          </div>
        </div>
      </div>
    </section>

    <!-- What a Real Solution Needs -->
    <section class="dashboard-section">
      <h2 class="section-heading">
        <span class="material-symbols-outlined">lightbulb</span>
        What a Real Solution Needs
      </h2>
      <div class="card ai-analysis-card">
        <div class="ai-analysis-icon">
          <span class="material-symbols-outlined">rocket_launch</span>
        </div>
        <p style="font-size:14px;line-height:1.7;">The future of amateur injury prevention requires integration of wearable kinematics and objective biomechanical screening, bridging the gap between elite tech and grassroots accessibility.</p>
      </div>
    </section>

    <!-- Key Literature -->
    <section class="dashboard-section">
      <h2 class="section-heading">
        <span class="material-symbols-outlined">article</span>
        Key Literature
      </h2>
      <div class="flex-col" style="gap:var(--space-md);">
        <div class="card" style="padding:var(--space-md) var(--space-lg);">
          <h4 style="font-size:15px;font-weight:600;margin-bottom:4px;">The acute:chronic workload ratio in relation to injury risk in professional athletes</h4>
          <p style="font-size:13px;color:var(--on-surface-variant);">Gabbett TJ. Br J Sports Med. 2016.</p>
        </div>
        <div class="card" style="padding:var(--space-md) var(--space-lg);">
          <h4 style="font-size:15px;font-weight:600;margin-bottom:4px;">Monitoring training load to understand fatigue in sports</h4>
          <p style="font-size:13px;color:var(--on-surface-variant);">Halson L. Sports Med. 2014.</p>
        </div>
        <div class="card" style="padding:var(--space-md) var(--space-lg);">
          <h4 style="font-size:15px;font-weight:600;margin-bottom:4px;">Shoe-surface interaction and the risk of injury in elite football</h4>
          <p style="font-size:13px;color:var(--on-surface-variant);">Stefanyshyn DJ, Wannop JW. Sports Med. 2015.</p>
        </div>
      </div>
    </section>
  `);
}
