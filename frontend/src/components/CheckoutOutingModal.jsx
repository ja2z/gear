import { useState, useEffect, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useInventory, useReservations } from '../hooks/useInventory';
import { checkoutModalEligibleEvents } from '../utils/outingFilters';
import { formatTroopEventDate } from '../utils/outingFormat';

/**
 * Modal: choose an existing event before browsing gear.
 * @param {() => void} [onContinueSuccess] — After event is set; e.g. navigate to categories from Gear landing.
 * @param {string} [dismissButtonLabel] — Secondary button when `onDismiss` is set (default "Back to Gear"; use "Cancel" on landing).
 */
export default function CheckoutOutingModal({
  open,
  onDismiss,
  onContinueSuccess,
  dismissButtonLabel = 'Back to Gear',
}) {
  const { getData } = useInventory();
  const { fetchReservationItemsIfExists } = useReservations();
  const { checkoutEvent, setCheckoutEvent, setCartReservationSession } = useCart();

  const [eventId, setEventId] = useState(checkoutEvent?.eventId || '');
  const [selectedName, setSelectedName] = useState(checkoutEvent?.outingName || '');
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [continueLoading, setContinueLoading] = useState(false);
  /** Reservation status for the currently selected event (preview before Continue). */
  const [reservationPreview, setReservationPreview] = useState({
    status: 'idle',
    payload: null,
  });

  const load = useCallback(async () => {
    try {
      setEventsLoading(true);
      const eventsData = await getData('/events');
      setEvents(eventsData);
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
    if (!open) setContinueLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setEventId(checkoutEvent?.eventId || '');
    setSelectedName(checkoutEvent?.outingName || '');
  }, [open, checkoutEvent?.eventId, checkoutEvent?.outingName]);

  useEffect(() => {
    if (!open || !eventId) {
      setReservationPreview({ status: 'idle', payload: null });
      return;
    }
    let cancelled = false;
    setReservationPreview({ status: 'loading', payload: null });
    fetchReservationItemsIfExists(eventId)
      .then((payload) => {
        if (cancelled) return;
        if (!payload) setReservationPreview({ status: 'none', payload: null });
        else setReservationPreview({ status: 'loaded', payload });
      })
      .catch(() => {
        if (!cancelled) setReservationPreview({ status: 'error', payload: null });
      });
    return () => {
      cancelled = true;
    };
  }, [open, eventId, fetchReservationItemsIfExists]);

  /** Today or future events; soonest first (troop timezone). */
  const eligibleEvents = useMemo(() => checkoutModalEligibleEvents(events), [events]);

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

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!eventId || continueLoading) return;
    const selected = eligibleEvents.find((ev) => String(ev.id) === String(eventId));
    setContinueLoading(true);
    try {
      const reservation = await fetchReservationItemsIfExists(eventId);
      if (reservation) {
        setCartReservationSession({
          items: reservation.items || [],
          meta: {
            fromReservation: true,
            eventId: reservation.eventId,
            outingName: reservation.outingName,
            scoutName: reservation.reservedBy,
            eventType: selected?.eventType ?? '',
            originalItems: (reservation.items || []).map((i) => ({
              itemId: i.itemId,
              description: i.description,
              itemClass: i.itemClass,
              itemNum: i.itemNum,
            })),
          },
        });
      } else {
        setCheckoutEvent({
          eventId,
          outingName: selectedName,
          scoutName: selected?.eventSplName || '',
          eventType: selected?.eventType ?? '',
        });
      }
      onContinueSuccess?.();
    } catch (err) {
      console.error(err);
      if (err?.message === 'Unauthorized') return;
      setCheckoutEvent({
        eventId,
        outingName: selectedName,
        scoutName: selected?.eventSplName || '',
        eventType: selected?.eventType ?? '',
      });
      onContinueSuccess?.();
    } finally {
      setContinueLoading(false);
    }
  };

  return (
    <div
      className="modal-dialog-overlay-root select-none z-[120]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-outing-modal-title"
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
              <h2 id="checkout-outing-modal-title" className="mb-1 text-lg font-bold text-gray-900">
                Which event is this for?
              </h2>
              <p className="text-sm text-gray-600 mb-5">Pick the event before you browse and check out gear.</p>
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
              <label htmlFor="checkout-modal-eventId" className="block text-sm font-semibold text-gray-700 mb-2">
                Event *
              </label>
              <select
                id="checkout-modal-eventId"
                value={eventId}
                onChange={handleEventSelect}
                required
                className="form-input w-full"
              >
                <option value="">
                  {eventsLoading
                    ? 'Loading events…'
                    : eligibleEvents.length === 0
                      ? 'No events today or upcoming'
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

            {eventId && reservationPreview.status !== 'idle' && (
              <div
                className={`rounded-xl border px-4 py-3 ${
                  reservationPreview.status === 'loaded'
                    ? 'border-scout-orange/40 bg-orange-50/90'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                {reservationPreview.status === 'loading' && (
                  <p className="text-sm text-gray-500">Checking whether this outing has a reservation…</p>
                )}
                {reservationPreview.status === 'error' && (
                  <p className="text-sm text-amber-900">
                    Could not load reservation status. You can still continue and check out gear.
                  </p>
                )}
                {reservationPreview.status === 'none' && (
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">No reservation on file.</span>{' '}
                    There is no gear reservation recorded for this outing. You can still browse and check out gear for
                    this event.
                  </p>
                )}
                {reservationPreview.status === 'loaded' && reservationPreview.payload && (
                  <>
                    <p className="text-sm font-semibold text-gray-900">Reservation on file</p>
                    <p className="mt-1 text-sm text-gray-700">
                      Gear is reserved for{' '}
                      <span className="font-medium">
                        {selectedName || reservationPreview.payload.outingName || 'this outing'}
                      </span>
                      {reservationPreview.payload.reservedBy ? (
                        <>
                          {' '}
                          by <span className="font-medium">{reservationPreview.payload.reservedBy}</span>
                        </>
                      ) : null}
                      .
                    </p>
                    {Array.isArray(reservationPreview.payload.items) && reservationPreview.payload.items.length > 0 ? (
                      <>
                        <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-sm text-gray-800">
                          {reservationPreview.payload.items.slice(0, 8).map((it) => (
                            <li key={it.itemId} className="flex min-w-0 gap-2">
                              <span className="shrink-0 font-medium text-scout-blue">{it.itemId}</span>
                              <span className="min-w-0 truncate text-gray-600">{it.description || '—'}</span>
                            </li>
                          ))}
                        </ul>
                        {reservationPreview.payload.items.length > 8 && (
                          <p className="mt-1.5 text-xs text-gray-500">
                            + {reservationPreview.payload.items.length - 8} more reserved
                            {reservationPreview.payload.items.length - 8 === 1 ? ' item' : ' items'}
                          </p>
                        )}
                      </>
                    ) : null}
                  </>
                )}
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
                disabled={!eventId || eventsLoading || continueLoading}
                className={`min-h-12 rounded-md bg-scout-blue text-white text-base font-medium disabled:opacity-50 touch-target ${onDismiss ? 'flex-1' : 'w-full'}`}
              >
                {continueLoading ? 'Loading…' : 'Check out'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
