// Simple hash-based SPA router
const routes = {};
let currentCleanup = null;

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
  const path = getCurrentPath();
  const handler = routes[path] || routes['/'];

  if (currentCleanup && typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  if (handler) {
    const result = await handler();
    if (typeof result === 'function') {
      currentCleanup = result;
    }
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
