/**
 * Production API base URL must end with `/api` so paths like `getApiBaseUrl() + '/inventory/...'`
 * resolve correctly. If `VITE_API_URL` is the origin only (e.g. `https://gear-backend.onrender.com`),
 * we append `/api`.
 *
 * In dev: if `VITE_API_URL` points at the same origin as the Vite app (e.g. `http://localhost:5173`),
 * using it would fetch HTML (SPA) instead of JSON. In that case we use relative `/api` so the
 * Vite proxy forwards to the backend (see `vite.config.js`).
 *
 * If `VITE_API_URL` pins :5173 but Vite actually runs on :5174 (port busy), requests would hit the
 * wrong dev server and return HTML instead of JSON — use relative `/api` on the current origin.
 */
export function getApiBaseUrl() {
  if (!import.meta.env.PROD) {
    const raw = import.meta.env.VITE_API_URL?.trim();
    if (!raw) return '/api';
    const noTrailing = raw.replace(/\/+$/, '');
    const withApi = /\/api$/i.test(noTrailing) ? noTrailing : `${noTrailing}/api`;
    if (typeof window !== 'undefined') {
      try {
        const u = new URL(withApi);
        const w = window.location;
        if (u.origin === w.origin) {
          return '/api';
        }
        if (
          u.hostname === w.hostname &&
          u.port !== '3001' &&
          u.port !== w.port
        ) {
          return '/api';
        }
      } catch {
        /* invalid URL — fall through */
      }
    }
    return withApi;
  }
  const raw = (import.meta.env.VITE_API_URL || '/api').trim();
  const noTrailingSlash = raw.replace(/\/+$/, '');
  if (/\/api$/i.test(noTrailingSlash)) return noTrailingSlash;
  return `${noTrailingSlash}/api`;
}
