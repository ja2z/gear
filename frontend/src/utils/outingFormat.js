import { TROOP_TZ, calendarYmdTroop } from './outingFilters';

/**
 * Parse API date into a local Date for calendar month grids (same Y/M/D as troop calendar).
 * @param {string} raw - `startDate` / `endDate` from events API
 */
export function parseTroopApiDateToLocalDate(raw) {
  const ymd = calendarYmdTroop(raw);
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format an event date for display. Matches calendar “true” day in troop TZ.
 * @param {object} [opts]
 * @param {boolean} [opts.short] - "Apr 11" (no year)
 * @param {boolean} [opts.list] - "Apr 11, 2026" (OutingListCard style)
 */
export function formatTroopEventDate(raw, opts = {}) {
  const { short = false, list = false } = opts;
  const ymd = calendarYmdTroop(raw);
  if (!ymd) return '';
  const [y, mo, d] = ymd.split('-').map(Number);
  const utcNoon = Date.UTC(y, mo - 1, d, 12, 0, 0);
  const dt = new Date(utcNoon);
  if (list) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TROOP_TZ,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(dt);
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TROOP_TZ,
    ...(short
      ? { month: 'short', day: 'numeric' }
      : { month: 'numeric', day: 'numeric', year: 'numeric' }),
  }).format(dt);
}

/** Format API date for outing list cards (short month + year). */
export function formatOutingDate(dateStr) {
  if (!dateStr) return null;
  const s = formatTroopEventDate(dateStr, { list: true });
  return s || null;
}
