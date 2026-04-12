/**
 * Maps API `event_types.type` to a short label ("Outing", "Meeting", …).
 * @param {string | undefined} eventType
 * @returns {string}
 */
export function eventKindLabel(eventType) {
  if (!eventType || typeof eventType !== 'string') return 'Event';
  const t = eventType.trim().toLowerCase();
  if (t.includes('meeting')) return 'Meeting';
  if (t.includes('outing')) return 'Outing';
  return eventType.charAt(0).toUpperCase() + eventType.slice(1).toLowerCase();
}
