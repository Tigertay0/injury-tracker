// App Shell — Sidebar + Layout + Footer matching Stitch designs
import { auth } from '../firebase.js';
import { signOut } from 'firebase/auth';
import { navigate, getCurrentPath } from '../router.js';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/log-session', label: 'Log Session', icon: 'history_edu' },
  { path: '/recovery', label: 'Recovery', icon: 'health_and_safety' },
  { path: '/equipment', label: 'My Equipment', icon: 'fitness_center' },
  { path: '/injuries', label: 'Injury History', icon: 'monitor_heart' },
  { path: '/methodology', label: 'Research', icon: 'science' },
];

export function renderAppShell(contentHtml) {
  const app = document.getElementById('app');
  const currentPath = getCurrentPath();
  const user = auth.currentUser;

  app.innerHTML = `
    <button class="hamburger" id="hamburger-btn">
      <span class="material-symbols-outlined">menu</span>
    </button>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-logo">
          <span class="material-symbols-outlined" style="font-size:28px;">shield</span>
          <div>
            <h1>PitchSafe</h1>
            <span class="sidebar-subtitle">Elite Performance</span>
          </div>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${NAV_ITEMS.map(item => `
          <a href="#${item.path}" class="sidebar-link ${currentPath === item.path ? 'active' : ''}">
            <span class="material-symbols-outlined">${item.icon}</span>
            ${item.label}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <span class="material-symbols-outlined" style="font-size:18px;">person</span>
          ${user?.email || 'User'}
        </div>
        <button class="sidebar-logout" id="logout-btn">
          <span class="material-symbols-outlined" style="font-size:16px;">logout</span>
          Sign Out
        </button>
      </div>
    </aside>

    <main class="with-sidebar">
      <div class="content-area">
        ${contentHtml}
      </div>
      <footer class="app-footer">
        <div class="footer-content">
          <p class="footer-disclaimer">
            <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">warning</span>
            <strong>Important:</strong> PitchSafe provides predictive insights based on amateur training data. It is not a substitute for professional medical advice. Always consult a physiotherapist or physician for actual injury diagnosis and treatment.
          </p>
          <div class="footer-bottom">
            <span>© 2024 PitchSafe Performance Lab. For amateur soccer injury prevention research purposes only.</span>
            <div class="footer-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Scientific Disclosure</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  `;

  // Logout
  app.querySelector('#logout-btn').addEventListener('click', async () => {
    await signOut(auth);
    navigate('/');
  });

  // Mobile hamburger
  const hamburger = app.querySelector('#hamburger-btn');
  const sidebar = app.querySelector('#sidebar');
  const overlay = app.querySelector('#sidebar-overlay');

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });

  // Close sidebar on nav click (mobile)
  sidebar.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  });
}
