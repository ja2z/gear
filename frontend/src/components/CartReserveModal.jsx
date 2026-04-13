import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useReservations } from '../hooks/useInventory';
import { useAuth } from '../context/AuthContext';

/**
 * Confirm reservation from the cart (same shell as CartCheckoutModal): summary, cancel / complete.
 */
export default function CartReserveModal({ open, onClose }) {
  const { items, clearCart, getTotalItems, reservationMeta } = useCart();
  const { postReservation, loading } = useReservations();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isEditing = reservationMeta?.isEditing === true;
  const userFullName = user ? `${user.first_name} ${user.last_name}` : '';

  const [submitError, setSubmitError] = useState(null);

  const outingLabel = reservationMeta?.outingName?.trim() || '';

  const reservedByResolved = useMemo(
    () =>
      (reservationMeta?.reservedBy || reservationMeta?.scoutName || userFullName || '').trim(),
    [reservationMeta?.reservedBy, reservationMeta?.scoutName, userFullName]
  );

  const reservedEmailResolved = useMemo(
    () => (reservationMeta?.reservedEmail || user?.email || '').trim(),
    [reservationMeta?.reservedEmail, user?.email]
  );

  useEffect(() => {
    if (!open) setSubmitError(null);
  }, [open]);

  useEffect(() => {
    if (!open || items.length === 0) return;
    const eid = reservationMeta?.eventId;
    if (eid == null || String(eid) === '') {
      onClose();
      navigate('/categories?mode=reserve', { replace: true });
    }
  }, [open, items.length, reservationMeta?.eventId, navigate, onClose]);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateEmail(reservedEmailResolved)) {
      setSubmitError('A valid contact email is required for this reservation.');
      return;
    }

    const eventId =
      reservationMeta?.eventId != null && String(reservationMeta.eventId) !== ''
        ? String(reservationMeta.eventId)
        : null;
    if (!eventId) {
      setSubmitError('Missing event. Go back and choose an event first.');
      return;
    }

    if (!reservedByResolved) {
      setSubmitError('Name could not be determined. Sign in or start the reservation again from the event picker.');
      return;
    }

    try {
      const itemIds = items.map((item) => item.itemId);
      const result = await postReservation({
        itemIds,
        eventId,
        reservedBy: reservedByResolved,
        reservedEmail: reservedEmailResolved,
      });

      const count = result.successful?.length || getTotalItems();
      clearCart();
      onClose();
      navigate(
        `/reservation-success?count=${count}&outing=${encodeURIComponent(result.outingName || outingLabel)}`
      );
    } catch (err) {
      setSubmitError(err.message || 'Failed to save reservation. Please try again.');
    }
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

  const eventReady =
    reservationMeta?.eventId != null && String(reservationMeta.eventId) !== '';
  const formReady =
    eventReady &&
    reservedByResolved.length > 0 &&
    validateEmail(reservedEmailResolved);

  if (!open) return null;

  return (
    <div
      className="modal-dialog-overlay-root select-none z-[140]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-reserve-modal-title"
    >
      <div
        role="presentation"
        aria-hidden
        className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div
          className="modal-dialog-panel-enter pointer-events-auto relative z-[141] flex max-h-[min(85dvh,38rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div className="min-w-0 flex-1 pr-2">
              <h2 id="cart-reserve-modal-title" className="text-lg font-bold text-gray-900">
                {isEditing ? 'Confirm reservation update' : 'Confirm reservation'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'} for{' '}
                <span className="font-medium text-gray-800">{outingLabel || 'this event'}</span>
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
            <form id="cart-reserve-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Event
                </p>
                <p className="mt-0.5 font-medium text-gray-900">{outingLabel || '—'}</p>
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
                            <span className="font-medium text-scout-orange">{item.itemId}</span>
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
                form="cart-reserve-form"
                disabled={!formReady || loading}
                className="flex-1 h-12 rounded-md bg-scout-orange text-base font-medium text-white disabled:opacity-50"
              >
                {loading ? 'Processing…' : isEditing ? 'Update' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
