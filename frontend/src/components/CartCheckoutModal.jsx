import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useInventory } from '../hooks/useInventory';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../config/apiBaseUrl';

/**
 * Cart checkout modal: event summary, POST /checkout. Youth leader (SPL) from event/reservation;
 * processedBy from the signed-in user (field not shown).
 */
export default function CartCheckoutModal({ open, onClose }) {
  const { items, clearCart, getTotalItems, reservationMeta, checkoutEvent, setCheckoutEvent } = useCart();
  const { postData, loading } = useInventory();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();

  const fromReservation =
    reservationMeta?.fromReservation === true || locationState?.fromReservation === true;
  const userFullName = user ? `${user.first_name} ${user.last_name}` : '';

  const [formData, setFormData] = useState({
    eventId:
      reservationMeta?.eventId ||
      checkoutEvent?.eventId ||
      locationState?.eventId ||
      '',
  });
  const [submitError, setSubmitError] = useState(null);
  const [removedItemsWarning, setRemovedItemsWarning] = useState(null);

  const outingLabel =
    reservationMeta?.outingName || checkoutEvent?.outingName || locationState?.outingName || '';

  /** API `scoutName` — from reservation or event’s SPL (set when event was chosen). */
  const outingLeaderName = useMemo(
    () =>
      (reservationMeta?.scoutName ||
        checkoutEvent?.scoutName ||
        locationState?.scoutName ||
        '').trim(),
    [
      reservationMeta?.scoutName,
      checkoutEvent?.scoutName,
      locationState?.scoutName,
    ]
  );

  useEffect(() => {
    const eid = reservationMeta?.eventId || checkoutEvent?.eventId;
    if (!eid) return;
    setFormData((prev) => ({
      ...prev,
      eventId: String(eid),
    }));
  }, [reservationMeta?.eventId, checkoutEvent?.eventId]);

  useEffect(() => {
    if (!open) {
      setSubmitError(null);
      setRemovedItemsWarning(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || items.length === 0) return;
    const eid = reservationMeta?.eventId || checkoutEvent?.eventId;
    if (!eid) {
      onClose();
      navigate('/categories', { replace: true });
    }
  }, [open, items.length, reservationMeta?.eventId, checkoutEvent?.eventId, navigate, onClose]);

  const eventReady = !!(reservationMeta?.eventId || checkoutEvent?.eventId || formData.eventId);

  const doCheckout = async () => {
    setSubmitError(null);
    if (!outingLeaderName) {
      setSubmitError(
        'Youth leader (SPL) could not be determined from this event. Try choosing a different event or updating the SPL on the event in the roster.'
      );
      return;
    }
    const processedBy = userFullName.trim();
    if (!processedBy) {
      setSubmitError('Could not determine who is processing checkout. Please sign in again.');
      return;
    }
    try {
      const itemIds = items.map((item) => item.itemId);
      const checkoutData = {
        itemIds,
        scoutName: outingLeaderName,
        eventId: formData.eventId,
        processedBy,
        notes: '',
      };

      const result = await postData('/checkout', checkoutData);

      if (result.success) {
        const itemCount = getTotalItems();
        if (fromReservation && reservationMeta?.eventId) {
          try {
            await fetch(`${getApiBaseUrl()}/reservations/${reservationMeta.eventId}`, {
              method: 'DELETE',
              credentials: 'include',
            });
          } catch (err) {
            console.error('Failed to clean up reservation:', err);
          }
        }
        clearCart();
        onClose();
        navigate(`/success?action=checkout&count=${itemCount}`);
      } else {
        setSubmitError(result.message || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setSubmitError('Failed to process checkout. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (fromReservation && reservationMeta?.originalItems) {
      const cartItemIds = new Set(items.map((i) => i.itemId));
      const removed = reservationMeta.originalItems.filter((i) => !cartItemIds.has(i.itemId));
      if (removed.length > 0) {
        setRemovedItemsWarning(removed);
        return;
      }
    }

    await doCheckout();
  };

  const groupedItems = useMemo(() => {
    const grouped = {};
    items.forEach((item) => {
      const key = item.itemClass || 'Other';
      if (!grouped[key]) {
        grouped[key] = { description: item.itemDesc || key, items: [] };
      }
      grouped[key].items.push(item);
    });
    Object.values(grouped).forEach((cat) =>
      cat.items.sort((a, b) => (a.itemNum || 0) - (b.itemNum || 0))
    );
    return grouped;
  }, [items]);

  if (!open) return null;

  return (
    <>
      <div
        className="modal-dialog-overlay-root select-none z-[140]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-checkout-modal-title"
      >
        <div
          role="presentation"
          aria-hidden
          className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
          onClick={onClose}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
          <div
            className="modal-dialog-panel-enter pointer-events-auto relative z-[141] flex max-h-[min(92dvh,44rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div className="min-w-0 flex-1 pr-2">
                <h2 id="cart-checkout-modal-title" className="text-lg font-bold text-gray-900">
                  Confirm checkout
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'} in cart
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="touch-target -mr-1 -mt-0.5 shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {fromReservation && (
                <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                  <p className="text-sm font-medium text-orange-800">
                    Checking out reserved gear for{' '}
                    <span className="font-bold">{outingLabel}</span>
                  </p>
                </div>
              )}

              <form id="cart-checkout-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Event
                  </p>
                  <p className="mt-0.5 font-medium text-gray-900">{outingLabel || '—'}</p>
                  {!fromReservation && (
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutEvent(null);
                        onClose();
                        navigate('/categories');
                      }}
                      className="mt-1.5 text-left text-sm font-medium text-scout-blue hover:underline"
                    >
                      Change event
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Items
                  </p>
                  <div className="max-h-32 space-y-2 overflow-y-auto">
                    {Object.entries(groupedItems).map(([classCode, group]) => (
                      <div key={classCode}>
                        <p className="text-xs text-gray-500">{group.description}</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {group.items.map((item) => (
                            <li key={item.itemId} className="text-sm text-gray-800">
                              <span className="font-medium text-scout-blue">{item.itemId}</span>
                              {item.description ? (
                                <span className="text-gray-600"> — {item.description}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {submitError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-800">{submitError}</p>
                  </div>
                )}

                {eventReady && !outingLeaderName && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    Youth leader (SPL) is missing for this event or reservation. Assign an SPL on the event in
                    the roster or set &quot;Reserved by&quot; on the reservation, then open checkout again.
                  </p>
                )}
              </form>
            </div>

            <div className="shrink-0 border-t border-gray-200 px-5 py-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="cart-checkout-form"
                  disabled={
                    !eventReady ||
                    loading ||
                    !outingLeaderName ||
                    !userFullName.trim()
                  }
                  className="flex-1 h-12 rounded-md bg-scout-blue text-base font-medium text-white disabled:opacity-50"
                  title={
                    !outingLeaderName
                      ? 'Needs an outing leader from the event or reservation'
                      : undefined
                  }
                >
                  {loading ? 'Processing…' : 'Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {removedItemsWarning && (
        <div
          className="modal-dialog-overlay-root select-none z-[150]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-checkout-removed-title"
        >
          <div
            role="presentation"
            aria-hidden
            className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
            onClick={() => setRemovedItemsWarning(null)}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
            <div className="modal-dialog-panel-enter pointer-events-auto relative z-[151] w-full max-w-md rounded-2xl bg-white px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] shadow-2xl sm:pb-10">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h2 id="cart-checkout-removed-title" className="min-w-0 flex-1 pr-2 text-lg font-bold text-gray-900">
                  Items not being checked out
                </h2>
                <button
                  type="button"
                  onClick={() => setRemovedItemsWarning(null)}
                  className="touch-target -mr-1 -mt-1 shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                The following {removedItemsWarning.length === 1 ? 'item was' : 'items were'} in your
                reservation but removed from the cart.{' '}
                {removedItemsWarning.length === 1 ? 'It' : 'They'} will be returned to available
                inventory:
              </p>
              <ul className="mb-5 space-y-1">
                {removedItemsWarning.map((item) => (
                  <li key={item.itemId} className="text-sm font-medium text-gray-800">
                    {item.itemId} — {item.description}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRemovedItemsWarning(null)}
                  className="flex-1 h-11 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
                >
                  Go back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRemovedItemsWarning(null);
                    doCheckout();
                  }}
                  disabled={loading}
                  className="flex-1 h-11 rounded-md bg-scout-blue text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? 'Processing…' : 'Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
