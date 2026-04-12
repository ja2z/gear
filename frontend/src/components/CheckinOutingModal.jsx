import { useState, useEffect, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { checkinModalEligibleEvents } from '../utils/outingFilters';
import { formatTroopEventDate } from '../utils/outingFormat';

/**
 * Pick an event (today or earlier, with gear still checked out) before browsing items to return.
 * @param {(payload: { eventId: string, outingName: string, scoutName: string, eventType?: string }) => void} onConfirm
 */
export default function CheckinOutingModal({
  open,
  onDismiss,
  onConfirm,
  dismissButtonLabel = 'Cancel',
}) {
  const { getData } = useInventory();

  const [eventId, setEventId] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [events, setEvents] = useState([]);
  const [outingsWithItems, setOutingsWithItems] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setEventsLoading(true);
      const [eventsData, outingsData] = await Promise.all([
        getData('/events'),
        getData('/inventory/outings'),
      ]);
      setEvents(eventsData || []);
      setOutingsWithItems(Array.isArray(outingsData) ? outingsData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setEventsLoading(false);
    }
  }, [getData]);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    setEventId('');
    setSelectedName('');
  }, [open]);

  /** Today or past events that still have ≥1 item checked out; today first, then older. */
  const eligibleEvents = useMemo(
    () => checkinModalEligibleEvents(events, outingsWithItems),
    [events, outingsWithItems]
  );

  useEffect(() => {
    if (!open || !eventId) return;
    const stillValid = eligibleEvents.some((ev) => String(ev.id) === String(eventId));
    if (!stillValid) {
      setEventId('');
      setSelectedName('');
    }
  }, [open, eligibleEvents, eventId]);

  if (!open) return null;

  const handleEventSelect = (e) => {
    const id = e.target.value;
    if (!id) {
      setEventId('');
      setSelectedName('');
      return;
    }
    const selected = eligibleEvents.find((ev) => String(ev.id) === String(id));
    setEventId(String(id));
    setSelectedName(selected?.name || '');
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (!eventId) return;
    const selected = eligibleEvents.find((ev) => String(ev.id) === String(eventId));
    onConfirm?.({
      eventId,
      outingName: selectedName,
      scoutName: selected?.eventSplName || '',
      eventType: selected?.eventType ?? '',
    });
  };

  return (
    <div
      className="modal-dialog-overlay-root select-none z-[120]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-outing-modal-title"
    >
      <div
        role="presentation"
        aria-hidden
        className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
        onClick={() => onDismiss?.()}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div
          className="modal-dialog-panel-enter pointer-events-auto relative z-[121] max-h-[min(90dvh,42rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-2">
              <h2 id="checkin-outing-modal-title" className="mb-1 text-lg font-bold text-gray-900">
                Which event is this for?
              </h2>
              <p className="text-sm text-gray-600 mb-5">
                Pick the event, then select gear to return to the shed.
              </p>
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="touch-target -mr-1 -mt-1 shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <form onSubmit={handleContinue} className="space-y-6">
            <div>
              <label htmlFor="checkin-modal-eventId" className="block text-sm font-semibold text-gray-700 mb-2">
                Event *
              </label>
              <select
                id="checkin-modal-eventId"
                value={eventId}
                onChange={handleEventSelect}
                required
                className="form-input w-full"
              >
                <option value="">
                  {eventsLoading
                    ? 'Loading events…'
                    : eligibleEvents.length === 0
                      ? 'No events with gear to return'
                      : 'Select an event'}
                </option>
                {eligibleEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                    {ev.startDate ? ` — ${formatTroopEventDate(ev.startDate)}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-row gap-3">
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="flex-1 min-h-12 rounded-md border border-gray-300 text-sm font-medium text-gray-700 touch-target"
                >
                  {dismissButtonLabel}
                </button>
              )}
              <button
                type="submit"
                disabled={!eventId || eventsLoading}
                className={`min-h-12 rounded-md bg-scout-green text-white text-base font-medium disabled:opacity-50 touch-target ${onDismiss ? 'flex-1' : 'w-full'}`}
              >
                Check in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
