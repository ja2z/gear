/** Days before today still counted as “upcoming” (ongoing trips, late planning). */
export const UPCOMING_BUFFER_DAYS = 3;

/** @param {string | undefined} s YYYY-MM-DD */
export function parseOutingYmd(s) {
  if (!s || typeof s !== 'string') return null;
  const [y, m, d] = s.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

/** Last calendar day of the outing (end date, or single-day start). */
export function eventLastDay(ev) {
  return parseOutingYmd(ev.endDate || ev.startDate);
}

function startOfToday() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

/** Start of today minus `bufferDays` — outings ending on or after this are “upcoming”. */
export function upcomingCutoffDate(bufferDays = UPCOMING_BUFFER_DAYS) {
  const c = startOfToday();
  c.setDate(c.getDate() - bufferDays);
  return c;
}

/**
 * @param {object[]} events
 * @param {'upcoming' | 'past'} filter
 * @param {number} [bufferDays]
 */
export function filterAndSortOutings(events, filter, bufferDays = UPCOMING_BUFFER_DAYS) {
  const cutoff = upcomingCutoffDate(bufferDays);
  const withLast = events
    .map((ev) => ({ ev, last: eventLastDay(ev) }))
    .filter(({ last }) => last != null);

  const upcomingRows = withLast.filter(({ last }) => last >= cutoff);
  const pastRows = withLast.filter(({ last }) => last < cutoff);

  if (filter === 'upcoming') {
    return upcomingRows
      .sort((a, b) => {
        const sa = parseOutingYmd(a.ev.startDate);
        const sb = parseOutingYmd(b.ev.startDate);
        if (!sa || !sb) return 0;
        return sa.getTime() - sb.getTime();
      })
      .map(({ ev }) => ev);
  }

  return pastRows
    .sort((a, b) => b.last.getTime() - a.last.getTime())
    .map(({ ev }) => ev);
}
