/**
 * Dev-only: pretend the user is logged in without the backend (sessionStorage flag).
 * Stripped from production builds via import.meta.env.DEV checks at call sites.
 */
export const DEV_AUTH_BYPASS_STORAGE_KEY = 'scout_gear_dev_auth_bypass';

export const DEV_MOCK_USER = {
  id: 'dev-bypass',
  email: 'dev@local.test',
  first_name: 'Dev',
  last_name: 'Bypass',
  role: 'admin',
};

export function isDevAuthBypassActive() {
  return (
    import.meta.env.DEV &&
    typeof sessionStorage !== 'undefined' &&
    sessionStorage.getItem(DEV_AUTH_BYPASS_STORAGE_KEY) === '1'
  );
}
