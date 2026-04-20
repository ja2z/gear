/** Days before today still counted as “upcoming” (ongoing trips, late planning). */
export const UPCOMING_BUFFER_DAYS = 0;

/** Troop calendar dates for gear checkout / check-in modals (align with event `startDate` comparisons). */
export const TROOP_TZ = 'America/Los_Angeles';

/** Today as YYYY-MM-DD in the troop timezone. */
export function todayYmdTroop() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TROOP_TZ });
}

/**
 * Normalize API `DATE` or ISO datetime to the calendar day YYYY-MM-DD in {@link TROOP_TZ}.
 * Plain `YYYY-MM-DD` is the roster/calendar truth and is not shifted.
 */
export function calendarYmdTroop(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s.slice(0, 10);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-CA', { timeZone: TROOP_TZ });
}

/** Event start as YYYY-MM-DD in troop TZ (see {@link calendarYmdTroop}). */
export function eventStartYmdTroop(ev) {
  return calendarYmdTroop(ev?.startDate);
}

/**
 * Checkout outing modal: events starting today or later. Sort soonest first (today → future).
 */
export function checkoutModalEligibleEvents(events) {
  const t = todayYmdTroop();
  return [...(events || [])]
    .filter((ev) => {
      const d = eventStartYmdTroop(ev);
      return d != null && d >= t;
    })
    .sort((a, b) => eventStartYmdTroop(a).localeCompare(eventStartYmdTroop(b)));
}

/**
 * Check-in outing modal: any event with at least one item still checked out, regardless of date.
 * Sort: today first, then progressively farther in the past, then future events soonest first.
 * @param {object[]} events from GET /events
 * @param {Array<{ eventId: string|number, itemCount?: number }>} outingsWithItems from GET /inventory/outings
 */
export function checkinModalEligibleEvents(events, outingsWithItems) {
  const t = todayYmdTroop();
  const withGear = new Set(
    (outingsWithItems || [])
      .filter((o) => (o.itemCount ?? 0) > 0)
      .map((o) => String(o.eventId))
  );
  return [...(events || [])]
    .filter((ev) => {
      if (!withGear.has(String(ev.id))) return false;
      return true;
    })
    .sort((a, b) => {
      const da = eventStartYmdTroop(a) ?? '';
      const db = eventStartYmdTroop(b) ?? '';
      // Past/today events first (sorted newest → oldest), then future events (soonest first)
      const aFuture = da > t;
      const bFuture = db > t;
      if (aFuture !== bFuture) return aFuture ? 1 : -1;
      return aFuture ? da.localeCompare(db) : db.localeCompare(da);
    });
}

/** Accepts YYYY-MM-DD or ISO timestamp; returns a local midnight Date in troop TZ. */
export function parseOutingYmd(raw) {
  const ymd = calendarYmdTroop(raw);
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
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
  const list = Array.isArray(events) ? events : [];
  const cutoff = upcomingCutoffDate(bufferDays);
  const withLast = list
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
