// Landing Page — Premium animated landing with interactive motion UI
import { navigate } from '../router.js';
import { auth } from '../firebase.js';

export async function renderLanding() {
  const app = document.getElementById('app');
  const isLoggedIn = !!auth.currentUser;

  app.innerHTML = `
    <div class="landing-page">
      <!-- Sticky Header -->
      <header class="landing-header">
        <div class="landing-header-inner">
          <div class="landing-logo">
            <span class="material-symbols-outlined" style="font-size:28px;color:var(--primary);">shield</span>
            <span class="landing-logo-text">PitchSafe</span>
          </div>
          <nav class="landing-nav">
            <a href="#/methodology" class="landing-nav-link">The Science</a>
            <a href="#/auth" class="landing-nav-link">Log In</a>
            <a href="#/auth" class="btn btn-primary btn-sm">Get Started</a>
          </nav>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="landing-hero">
        <!-- Animated background particles -->
        <div class="hero-particles" id="hero-particles"></div>
        <!-- Animated grid lines -->
        <div class="hero-grid-overlay"></div>

        <div class="hero-content anim-fade-up">
          <div class="hero-badge anim-pop">
            <span class="material-symbols-outlined" style="font-size:16px;">science</span>
            INJURY PREVENTION RESEARCH LAB
          </div>
          <h1 class="hero-title anim-fade-up anim-delay-1">KNOW YOUR RISK.<br/>PROTECT YOUR GAME.</h1>
          <p class="hero-subtitle anim-fade-up anim-delay-2">Elite performance starts with staying on the pitch. PitchSafe uses scientifically-backed workload monitoring to predict and prevent amateur soccer injuries.</p>
          <p class="hero-tagline anim-fade-up anim-delay-2">100% free. No ads. No equipment needed.</p>
          <div class="hero-ctas anim-fade-up anim-delay-3">
            <button class="btn btn-primary btn-lg hero-btn-glow" id="hero-cta-start">
              <span class="material-symbols-outlined">rocket_launch</span>
              GET STARTED FREE
            </button>
            <button class="btn btn-secondary btn-lg" id="hero-cta-science" style="border-color:rgba(255,255,255,0.4);color:white;">
              <span class="material-symbols-outlined">science</span>
              SEE THE SCIENCE
            </button>
          </div>
        </div>

        <!-- Floating stat cards replacing the dial -->
        <div class="hero-floating-cards anim-fade-up anim-delay-2">
          <div class="floating-card fc-1">
            <div class="floating-card-icon" style="background:var(--risk-green-bg);color:var(--risk-green);">
              <span class="material-symbols-outlined">speed</span>
            </div>
            <div class="floating-card-body">
              <span class="floating-card-label">ACWR</span>
              <span class="floating-card-value" id="fc-acwr">1.12</span>
            </div>
            <span class="risk-badge risk-badge-low">Sweet Spot</span>
          </div>
          <div class="floating-card fc-2">
            <div class="floating-card-icon" style="background:rgba(255,255,255,0.15);color:white;">
              <span class="material-symbols-outlined">hotel</span>
            </div>
            <div class="floating-card-body">
              <span class="floating-card-label">Recovery</span>
              <span class="floating-card-value" id="fc-recovery">8.2</span>
            </div>
            <span class="risk-badge risk-badge-low">Good</span>
          </div>
          <div class="floating-card fc-3">
            <div class="floating-card-icon" style="background:var(--risk-yellow-bg);color:var(--risk-yellow);">
              <span class="material-symbols-outlined">fitness_center</span>
            </div>
            <div class="floating-card-body">
              <span class="floating-card-label">Equipment</span>
              <span class="floating-card-value">AG</span>
            </div>
            <span class="risk-badge risk-badge-moderate">Check</span>
          </div>
        </div>
      </section>

      <!-- Animated stats bar -->
      <section class="stats-bar">
        <div class="stats-bar-inner">
          <div class="stat-item anim-count" data-target="87" data-suffix="%">
            <span class="stat-number" id="stat-1">0</span><span class="stat-suffix">%</span>
            <span class="stat-desc">Injury risk reduction with proper load management</span>
          </div>
          <div class="stat-item anim-count" data-target="30" data-suffix="sec">
            <span class="stat-number" id="stat-2">0</span><span class="stat-suffix">sec</span>
            <span class="stat-desc">Average time to log a session</span>
          </div>
          <div class="stat-item anim-count" data-target="4" data-suffix="wks">
            <span class="stat-number" id="stat-3">0</span><span class="stat-suffix">wks</span>
            <span class="stat-desc">To build your baseline risk model</span>
          </div>
        </div>
      </section>

      <!-- How It Works -->
      <section class="landing-how-it-works">
        <div class="how-it-works-inner">
          <div class="section-label anim-slide-in">
            <span class="material-symbols-outlined" style="font-size:18px;">auto_awesome</span>
            HOW IT WORKS
          </div>
          <h2 class="section-title anim-slide-in">Three simple steps to optimize your workload and reduce injury risk during the season.</h2>

          <div class="steps-grid">
            <div class="step-card anim-slide-in anim-delay-1" id="step-1">
              <div class="step-number">01</div>
              <div class="step-icon step-icon-pulse">
                <span class="material-symbols-outlined">history_edu</span>
              </div>
              <h3>Log Sessions</h3>
              <p>Record your match minutes, training intensity (RPE), and recovery metrics in under 30 seconds.</p>
              <div class="step-preview">
                <div class="mini-slider">
                  <div class="mini-slider-track">
                    <div class="mini-slider-fill" id="mini-slider-fill"></div>
                    <div class="mini-slider-thumb" id="mini-slider-thumb"></div>
                  </div>
                  <span class="mini-slider-label">RPE: <strong id="mini-rpe">6</strong></span>
                </div>
              </div>
            </div>
            <div class="step-card anim-slide-in anim-delay-2" id="step-2">
              <div class="step-number">02</div>
              <div class="step-icon">
                <span class="material-symbols-outlined">speed</span>
              </div>
              <h3>Get Risk Score</h3>
              <p>Our algorithm analyzes your acute-to-chronic workload ratio to identify dangerous spikes in fatigue.</p>
              <div class="step-preview">
                <div class="mini-gauge">
                  <svg viewBox="0 0 100 100" width="80" height="80">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(26,107,60,0.15)" stroke-width="8"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--risk-green)" stroke-width="8" stroke-linecap="round"
                      stroke-dasharray="251" stroke-dashoffset="100" transform="rotate(-90 50 50)" class="mini-gauge-fill"/>
                    <text x="50" y="54" text-anchor="middle" fill="var(--on-surface)" font-family="'Bebas Neue',sans-serif" font-size="24">60</text>
                  </svg>
                </div>
              </div>
            </div>
            <div class="step-card anim-slide-in anim-delay-3" id="step-3">
              <div class="step-number">03</div>
              <div class="step-icon">
                <span class="material-symbols-outlined">trending_up</span>
              </div>
              <h3>Train Smarter</h3>
              <p>Receive personalized daily recommendations to rest, recover, or push harder based on your data.</p>
              <div class="step-preview">
                <div class="mini-bars">
                  <div class="mini-bar" style="--bar-h:60%;background:var(--risk-green);"></div>
                  <div class="mini-bar" style="--bar-h:80%;background:var(--risk-green);"></div>
                  <div class="mini-bar" style="--bar-h:45%;background:var(--risk-yellow);"></div>
                  <div class="mini-bar" style="--bar-h:90%;background:var(--risk-red);animation-delay:0.3s;"></div>
                  <div class="mini-bar" style="--bar-h:70%;background:var(--risk-green);animation-delay:0.4s;"></div>
                  <div class="mini-bar" style="--bar-h:55%;background:var(--risk-yellow);animation-delay:0.5s;"></div>
                  <div class="mini-bar" style="--bar-h:65%;background:var(--risk-green);animation-delay:0.6s;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Banner -->
      <section class="cta-banner">
        <div class="cta-banner-inner anim-fade-up">
          <h2>Ready to protect your game?</h2>
          <p>Join amateur athletes using sports science to train smarter and stay injury-free.</p>
          <button class="btn btn-primary btn-lg hero-btn-glow" id="bottom-cta">
            <span class="material-symbols-outlined">rocket_launch</span>
            START TRACKING FREE
          </button>
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <div class="landing-footer-inner">
          <span>© 2024 PitchSafe Performance Lab. For amateur soccer injury prevention research purposes only.</span>
          <div class="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Scientific Disclosure</a>
          </div>
        </div>
      </footer>
    </div>
  `;

  // --- Navigation ---
  const dest = isLoggedIn ? '/dashboard' : '/auth';
  document.getElementById('hero-cta-start')?.addEventListener('click', () => navigate(dest));
  document.getElementById('bottom-cta')?.addEventListener('click', () => navigate(dest));
  document.getElementById('hero-cta-science')?.addEventListener('click', () => navigate(isLoggedIn ? '/methodology' : '/methodology'));

  // --- Particle system ---
  createParticles();

  // --- Counting animation on scroll ---
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.anim-slide-in, .anim-fade-up, .anim-count').forEach(el => observer.observe(el));

  // Count-up for stats bar
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounters();
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  const statsBar = document.querySelector('.stats-bar');
  if (statsBar) statsObserver.observe(statsBar);

  // Floating card value tick animation
  animateFloatingCards();

  // Mini RPE slider animation
  animateMiniSlider();
}

function createParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left:${Math.random()*100}%;top:${Math.random()*100}%;
      width:${2+Math.random()*4}px;height:${2+Math.random()*4}px;
      animation-delay:${Math.random()*6}s;animation-duration:${4+Math.random()*6}s;
      opacity:${0.15+Math.random()*0.25};
    `;
    container.appendChild(p);
  }
}

function animateCounters() {
  [['stat-1',87],['stat-2',30],['stat-3',4]].forEach(([id,target]) => {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = target / 40;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = Math.round(current);
    }, 30);
  });
}

function animateFloatingCards() {
  const acwr = document.getElementById('fc-acwr');
  const rec = document.getElementById('fc-recovery');
  if (!acwr || !rec) return;
  setInterval(() => {
    const a = (1.05 + Math.random() * 0.15).toFixed(2);
    const r = (7.5 + Math.random() * 2).toFixed(1);
    acwr.textContent = a;
    rec.textContent = r;
  }, 3000);
}

function animateMiniSlider() {
  const fill = document.getElementById('mini-slider-fill');
  const thumb = document.getElementById('mini-slider-thumb');
  const label = document.getElementById('mini-rpe');
  if (!fill || !thumb || !label) return;
  let dir = 1, val = 60;
  setInterval(() => {
    val += dir * (2 + Math.random() * 4);
    if (val > 85) dir = -1;
    if (val < 20) dir = 1;
    fill.style.width = val + '%';
    thumb.style.left = val + '%';
    label.textContent = Math.round(val / 10);
  }, 400);
}
