// One public address: always https, and www folds into the bare domain. Clerk stamps
// each login with the page's origin, so a visit over plain http produced logins the
// API (correctly) refused.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const PRIVATE_IP = /^(10|127)\.\d+\.\d+\.\d+$|^192\.168\.\d+\.\d+$|^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/;

function isLocal(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith('.localhost') || PRIVATE_IP.test(hostname);
}

/** Hosts this Worker answers for in production: the site, its www, and workers.dev. */
function isOurHost(hostname: string, siteHost: string): boolean {
  if (hostname.endsWith('.workers.dev')) return true;
  return Boolean(siteHost) && (hostname === siteHost || hostname === `www.${siteHost}`);
}

/** Returns the URL to redirect to, or null when the request is already canonical. */
export function canonicalRedirect(url: URL, siteHost: string): string | null {
  if (isLocal(url.hostname)) return null;
  // Never build a redirect from a host we do not own
  if (!isOurHost(url.hostname, siteHost)) return null;
  const host = siteHost && url.hostname === `www.${siteHost}` ? siteHost : url.hostname;
  if (url.protocol === 'https:' && host === url.hostname) return null;
  return `https://${host}${url.pathname}${url.search}`;
}
