// Simple hash-based SPA router
const routes = {};
let currentCleanup = null;
let navigationId = 0;
let listening = false;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentPath() {
  return window.location.hash.slice(1) || '/';
}

export async function handleRoute() {
  const id = ++navigationId;
  const path = getCurrentPath();
  const handler = routes[path] || routes['/'];

  if (currentCleanup && typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  if (handler) {
    const result = await handler();
    if (typeof result !== 'function') return;
    // A newer navigation started while this handler was loading — tear it down now
    if (id !== navigationId) result();
    else currentCleanup = result;
  }
}

// Registers the hashchange listener once; safe to call repeatedly
export function initRouter() {
  if (listening) return;
  listening = true;
  window.addEventListener('hashchange', () => {
    handleRoute().catch(err => console.error('[router] Route failed to render:', err));
  });
}
