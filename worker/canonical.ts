// One public address: always https, and www folds into the bare domain. Clerk stamps
// each login with the page's origin, so a visit over plain http produced logins the
// API (correctly) refused.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Returns the URL to redirect to, or null when the request is already canonical. */
export function canonicalRedirect(url: URL, siteHost: string): string | null {
  if (LOCAL_HOSTS.has(url.hostname)) return null;
  const host = siteHost && url.hostname === `www.${siteHost}` ? siteHost : url.hostname;
  if (url.protocol === 'https:' && host === url.hostname) return null;
  return `https://${host}${url.pathname}${url.search}${url.hash}`;
}
