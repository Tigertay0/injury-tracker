import './style.css';
import './pages.css';
import './landing-animations.css';
import { auth } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { registerRoute, initRouter, navigate, getCurrentPath } from './router.js';

// Pages
import { renderLanding } from './pages/landing.js';
import { renderAuth } from './pages/auth.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderLogSession } from './pages/log-session.js';
import { renderRecovery } from './pages/recovery.js';
import { renderInjuries } from './pages/injuries.js';
import { renderEquipment } from './pages/equipment.js';
import { renderMethodology } from './pages/methodology.js';

// Auth-protected routes
const protectedRoutes = ['/dashboard', '/log-session', '/recovery', '/injuries', '/equipment', '/methodology'];

let currentUser = null;

// Register all routes
registerRoute('/', renderLanding);
registerRoute('/auth', renderAuth);
registerRoute('/dashboard', renderDashboard);
registerRoute('/log-session', renderLogSession);
registerRoute('/recovery', renderRecovery);
registerRoute('/injuries', renderInjuries);
registerRoute('/equipment', renderEquipment);
registerRoute('/methodology', renderMethodology);

// Auth state listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  const path = getCurrentPath();

  if (!user && protectedRoutes.includes(path)) {
    navigate('/auth');
  } else if (user && (path === '/auth' || path === '/')) {
    navigate('/dashboard');
  } else {
    // Re-render current route with new auth state
    initRouter();
  }
});

export function getUser() {
  return currentUser;
}
