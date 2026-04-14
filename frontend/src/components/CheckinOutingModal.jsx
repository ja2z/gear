import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, X } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { checkinModalEligibleEvents } from '../utils/outingFilters';
import { formatTroopEventDate } from '../utils/outingFormat';

/** Select value for “show all checked-out gear” (any event). */
export const CHECKIN_ALL_EVENTS_VALUE = '__all__';

/**
 * Pick an event (today or earlier, with gear still checked out) before browsing items to return.
 * @param {(payload: { eventId: string, outingName: string, scoutName: string, eventType?: string } | { allEvents: true, eventId?: null, outingName?: string, scoutName?: string, eventType?: string }) => void} onConfirm
 */
export default function CheckinOutingModal({
  open,
  onDismiss,
  onConfirm,
  dismissButtonLabel = 'Cancel',
}) {
  const { getData } = useInventory();

  const [eventId, setEventId] = useState(CHECKIN_ALL_EVENTS_VALUE);
  const [selectedName, setSelectedName] = useState('');
  const [events, setEvents] = useState([]);
  const [outingsWithItems, setOutingsWithItems] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  /** All gear currently checked out for the selected event (same API as calendar / manage). */
  const [checkedOutState, setCheckedOutState] = useState({ status: 'idle', items: [] });

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
    setEventId(CHECKIN_ALL_EVENTS_VALUE);
    setSelectedName('');
  }, [open]);

  /** Today or past events that still have ≥1 item checked out; today first, then older. */
  const eligibleEvents = useMemo(
    () => checkinModalEligibleEvents(events, outingsWithItems),
    [events, outingsWithItems]
  );

  useEffect(() => {
    if (!open || !eventId || eventId === CHECKIN_ALL_EVENTS_VALUE) return;
    const stillValid = eligibleEvents.some((ev) => String(ev.id) === String(eventId));
    if (!stillValid) {
      setEventId(CHECKIN_ALL_EVENTS_VALUE);
      setSelectedName('');
    }
  }, [open, eligibleEvents, eventId]);

  useEffect(() => {
    if (!open) {
      setCheckedOutState({ status: 'idle', items: [] });
      return undefined;
    }
    if (!eventId || eventId === CHECKIN_ALL_EVENTS_VALUE) {
      if (eventId === CHECKIN_ALL_EVENTS_VALUE) {
        let cancelled = false;
        setCheckedOutState({ status: 'loading', items: [] });
        getData('/inventory', true)
          .then((inv) => {
            if (cancelled) return;
            const list = Array.isArray(inv)
              ? inv.filter((row) => row.status === 'Checked out')
              : [];
            setCheckedOutState({ status: 'loaded', items: list });
          })
          .catch(() => {
            if (!cancelled) setCheckedOutState({ status: 'error', items: [] });
          });
        return () => {
          cancelled = true;
        };
      }
      setCheckedOutState({ status: 'idle', items: [] });
      return undefined;
    }
    let cancelled = false;
    setCheckedOutState({ status: 'loading', items: [] });
    getData(`/inventory/checked-out/${encodeURIComponent(eventId)}`)
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setCheckedOutState({ status: 'loaded', items: list });
      })
      .catch(() => {
        if (!cancelled) setCheckedOutState({ status: 'error', items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [open, eventId, getData]);

  if (!open) return null;

  const handleEventSelect = (e) => {
    const id = e.target.value;
    if (!id) {
      setEventId(CHECKIN_ALL_EVENTS_VALUE);
      setSelectedName('');
      return;
    }
    if (id === CHECKIN_ALL_EVENTS_VALUE) {
      setEventId(CHECKIN_ALL_EVENTS_VALUE);
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
    if (eventId === CHECKIN_ALL_EVENTS_VALUE) {
      onConfirm?.({
        allEvents: true,
        eventId: null,
        outingName: '',
        scoutName: '',
        eventType: '',
      });
      return;
    }
    const selected = eligibleEvents.find((ev) => String(ev.id) === String(eventId));
    onConfirm?.({
      eventId,
      outingName: selectedName,
      scoutName: selected?.eventSplName || '',
      eventType: selected?.eventType ?? '',
    });
  };

  const continueDisabled =
    !eventId ||
    (eventId !== CHECKIN_ALL_EVENTS_VALUE &&
      (eventsLoading || !eligibleEvents.some((ev) => String(ev.id) === String(eventId))));

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
          className="modal-dialog-panel-enter pointer-events-auto relative z-[121] max-h-[min(85dvh,36rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-2">
              <h2 id="checkin-outing-modal-title" className="mb-1 text-lg font-bold text-gray-900">
                Which event is this for?
              </h2>
              <p className="text-sm text-gray-600 mb-5">
                Choose an event to filter, or leave <span className="font-medium text-gray-800">All events</span> to see
                everything that&apos;s checked out.
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
                Event
              </label>
              <select
                id="checkin-modal-eventId"
                value={eventId}
                onChange={handleEventSelect}
                className="form-input w-full"
              >
                <option value={CHECKIN_ALL_EVENTS_VALUE}>All events</option>
                {eligibleEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                    {ev.startDate ? ` — ${formatTroopEventDate(ev.startDate)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {eventId && checkedOutState.status !== 'idle' && (
              <div className="rounded-xl border border-scout-green/25 bg-scout-green/[0.06] p-4">
                <p className="text-sm font-semibold text-gray-900">
                  Checked out gear
                  {eventId === CHECKIN_ALL_EVENTS_VALUE ? (
                    <span className="font-normal text-gray-600"> (all events)</span>
                  ) : null}
                </p>
                <div className="mt-2">
                  {checkedOutState.status === 'loading' && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden />
                    </div>
                  )}
                  {checkedOutState.status === 'error' && (
                    <p className="text-sm text-gray-600">
                      {eventId === CHECKIN_ALL_EVENTS_VALUE
                        ? 'Could not load checked-out gear.'
                        : 'Could not load checked-out gear for this event.'}
                    </p>
                  )}
                  {checkedOutState.status === 'loaded' && checkedOutState.items.length > 0 && (
                    <ul className="max-h-32 space-y-0.5 overflow-y-auto overscroll-contain text-sm text-gray-800">
                      {checkedOutState.items.map((it) => (
                        <li key={it.itemId} className="flex min-w-0 gap-2">
                          <span className="shrink-0 font-medium text-scout-blue">{it.itemId}</span>
                          <span className="min-w-0 truncate text-gray-600">{it.description || '—'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {checkedOutState.status === 'loaded' && checkedOutState.items.length === 0 && (
                    <p className="text-sm text-gray-600">
                      {eventId === CHECKIN_ALL_EVENTS_VALUE
                        ? 'No gear is currently checked out.'
                        : 'No gear is currently checked out for this event.'}
                    </p>
                  )}
                </div>
              </div>
            )}

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
                disabled={continueDisabled}
                className={`min-h-12 rounded-md bg-scout-green text-white text-base font-medium disabled:opacity-50 touch-target ${onDismiss ? 'flex-1' : 'w-full'}`}
              >
                Begin Check in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
