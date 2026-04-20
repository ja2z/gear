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

/**
 * Parse a stored ISO timestamp back to { date: 'YYYY-MM-DD', time: 'HH:mm' } in the event's timezone.
 * Returns time as '' when it is midnight (no specific time was set).
 */
export function isoToLocalDateTimeParts(isoStr, timezone) {
  if (!isoStr) return { date: '', time: '' };
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  const tz = timezone || TROOP_TZ;
  const date = d.toLocaleDateString('en-CA', { timeZone: tz });
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d).replace('24:', '00:');
  return { date, time: timeFmt === '00:00' ? '' : timeFmt };
}

/**
 * Format an event's start datetime for display.
 * Shows date only when time is midnight; shows date + time + TZ abbreviation otherwise.
 */
export function formatEventDateTime(isoStr, timezone, opts = {}) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const tz = timezone || TROOP_TZ;
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d).replace('24:', '00:');
  if (timeFmt === '00:00') return formatTroopEventDate(isoStr, opts);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(d);
}
