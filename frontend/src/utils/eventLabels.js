/**
 * SPL / lead scout label from troop event type (`event.eventType` from API).
 * Meetings use "Meeting leader"; day/overnight outings use "Outing leader";
 * unknown / unset uses "Event leader".
 *
 * @param {string | undefined} eventType
 * @returns {'Meeting leader' | 'Outing leader' | 'Event leader'}
 */
export function primaryLeaderLabel(eventType) {
  if (eventType === 'Meeting') return 'Meeting leader';
  if (!eventType) return 'Event leader';
  return 'Outing leader';
}

/**
 * Trimmed leader name or null if absent/blank.
 * @param {unknown} value
 * @returns {string | null}
 */
export function displayLeaderName(value) {
  if (value == null || value === '') return null;
  const t = String(value).trim();
  return t.length > 0 ? t : null;
}

/**
 * Primary leader name from an event (camelCase API; optional snake_case).
 * @param {Record<string, unknown> | null | undefined} ev
 * @returns {string | null}
 */
export function primaryLeaderNameFromEvent(ev) {
  if (!ev || typeof ev !== 'object') return null;
  return displayLeaderName(ev.eventSplName ?? ev.event_spl_name);
}

/**
 * Adult leader name from an event.
 * @param {Record<string, unknown> | null | undefined} ev
 * @returns {string | null}
 */
export function adultLeaderNameFromEvent(ev) {
  if (!ev || typeof ev !== 'object') return null;
  return displayLeaderName(ev.adultLeaderName ?? ev.adult_leader_name);
}
