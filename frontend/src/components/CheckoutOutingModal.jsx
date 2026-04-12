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
          className="modal-dialog-panel-enter pointer-events-auto relative z-[121] max-h-[min(90dvh,42rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-10 shadow-2xl"
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
