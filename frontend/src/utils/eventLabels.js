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
