import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useInventory } from '../hooks/useInventory';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../config/apiBaseUrl';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';
import { eventKindLabel } from '../utils/eventKindLabel';
const defaultDate = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

const Checkout = () => {
  const { items, clearCart, getTotalItems, reservationMeta, checkoutEvent, setCheckoutEvent } = useCart();
  const { postData, loading, getData } = useInventory();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const submittedRef = useRef(false);
  const isDesktop = useIsDesktop();
  const fromReservation = reservationMeta?.fromReservation === true || locationState?.fromReservation === true;
  const userFullName = user ? `${user.first_name} ${user.last_name}` : '';

  useDesktopHeader({ title: 'Checkout Information' });

  const [formData, setFormData] = useState({
    eventId:
      reservationMeta?.eventId ||
      checkoutEvent?.eventId ||
      locationState?.eventId ||
      '',
    scoutName:
      reservationMeta?.scoutName ||
      locationState?.scoutName ||
      checkoutEvent?.scoutName ||
      '',
    qmName: userFullName,
    date: defaultDate(),
  });
  const [submitError, setSubmitError] = useState(null);
  const [removedItemsWarning, setRemovedItemsWarning] = useState(null);

  const outingLabel =
    reservationMeta?.outingName || checkoutEvent?.outingName || locationState?.outingName || '';

  const eventIdResolved =
    formData.eventId ||
    reservationMeta?.eventId ||
    checkoutEvent?.eventId ||
    locationState?.eventId ||
    '';
  const eventTypeFromCart =
    reservationMeta?.eventType || checkoutEvent?.eventType || locationState?.eventType || '';
  const [fetchedEventType, setFetchedEventType] = useState('');

  useEffect(() => {
    setFetchedEventType('');
  }, [eventIdResolved]);

  useEffect(() => {
    if (!eventIdResolved || eventTypeFromCart) return;
    let cancelled = false;
    const id = String(eventIdResolved);
    getData(`/events/${id}`)
      .then((ev) => {
        if (cancelled || !ev?.eventType) return;
        setFetchedEventType(ev.eventType);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [eventIdResolved, eventTypeFromCart, getData]);

  const checkoutKind = eventKindLabel(eventTypeFromCart || fetchedEventType);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, qmName: userFullName }));
  }, [userFullName]);

  useEffect(() => {
    const eid = reservationMeta?.eventId || checkoutEvent?.eventId;
    if (!eid) return;
    setFormData((prev) => ({
      ...prev,
      eventId: String(eid),
      scoutName:
        reservationMeta?.scoutName ?? checkoutEvent?.scoutName ?? prev.scoutName,
    }));
  }, [reservationMeta?.eventId, reservationMeta?.scoutName, checkoutEvent?.eventId, checkoutEvent?.scoutName]);

  useEffect(() => {
    if (items.length === 0) return;
    const eid = reservationMeta?.eventId || checkoutEvent?.eventId;
    if (eid) return;
    navigate('/categories', { replace: true });
  }, [items.length, reservationMeta?.eventId, checkoutEvent?.eventId, navigate]);

  const eventReady = !!(reservationMeta?.eventId || checkoutEvent?.eventId || formData.eventId);

  const secondaryFieldClass = 'form-input';
  const secondaryLabelClass = 'block text-sm font-semibold text-gray-700 mb-2';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const doCheckout = async () => {
    setSubmitError(null);
    try {
      const itemIds = items.map((item) => item.itemId);
      const checkoutData = {
        itemIds,
        scoutName: formData.scoutName,
        eventId: formData.eventId,
        processedBy: formData.qmName,
        notes: '',
      };

      const result = await postData('/checkout', checkoutData);

      if (result.success) {
        submittedRef.current = true;
        const itemCount = getTotalItems();
        if (fromReservation && reservationMeta?.eventId) {
          try {
            await fetch(
              `${getApiBaseUrl()}/reservations/${reservationMeta.eventId}`,
              { method: 'DELETE', credentials: 'include' }
            );
          } catch (err) {
            console.error('Failed to clean up reservation:', err);
          }
        }
        navigate(`/success?action=checkout&count=${itemCount}`);
        clearCart();
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
      const cartItemIds = new Set(items.map(i => i.itemId));
      const removed = reservationMeta.originalItems.filter(i => !cartItemIds.has(i.itemId));
      if (removed.length > 0) {
        setRemovedItemsWarning(removed);
        return;
      }
    }

    await doCheckout();
  };

  const groupedItems = useMemo(() => {
    const grouped = {};
    items.forEach(item => {
      const key = item.itemClass || 'Other';
      if (!grouped[key]) {
        grouped[key] = { description: item.itemDesc || key, items: [] };
      }
      grouped[key].items.push(item);
    });
    Object.values(grouped).forEach(cat =>
      cat.items.sort((a, b) => (a.itemNum || 0) - (b.itemNum || 0))
    );
    return grouped;
  }, [items]);

  if (items.length === 0 && !submittedRef.current) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No items in cart</h2>
          <Link
            to="/categories"
            className="inline-block bg-scout-blue/12 border border-scout-blue/20 text-scout-blue px-6 py-3 rounded-lg hover:bg-scout-blue/18 transition-colors touch-target no-underline"
          >
            Select outing & browse
          </Link>
        </div>
      </div>
    );
  }

  const formContent = (
    <>
      {fromReservation && (
        <div className="mb-5 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
          <p className="text-sm text-orange-800 font-medium">
            Checking out reserved gear for <span className="font-bold">{outingLabel}</span>
          </p>
        </div>
      )}

      <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p
              className="text-center text-base text-gray-900"
              title={`${checkoutKind}: ${outingLabel || '—'}`}
            >
              <span className="font-semibold text-gray-600">{checkoutKind}:</span>{' '}
              <span className="font-semibold">{outingLabel || '—'}</span>
            </p>
            {!fromReservation && (
              <button
                type="button"
                onClick={() => {
                  setCheckoutEvent(null);
                  navigate('/categories');
                }}
                className="mt-2 block text-left text-sm font-medium text-scout-blue hover:underline"
              >
                Change outing
              </button>
            )}
          </div>

          <div>
            <label htmlFor="scoutName" className={secondaryLabelClass}>
              Checked out to (Outing Leader Name) *
            </label>
            <input
              type="text"
              id="scoutName"
              name="scoutName"
              value={formData.scoutName}
              onChange={handleChange}
              required={eventReady}
              className={secondaryFieldClass}
              placeholder="Enter outing leader name"
            />
          </div>

          <div>
            <label htmlFor="qmName" className={user ? 'block text-sm font-semibold text-gray-700 mb-2' : secondaryLabelClass}>
              Checked out by (QM name) *
            </label>
            <input
              type="text"
              id="qmName"
              name="qmName"
              value={formData.qmName}
              onChange={handleChange}
              disabled={!!user}
              required={eventReady}
              className={user ? 'form-input bg-gray-50 text-gray-500 cursor-not-allowed opacity-60' : secondaryFieldClass}
              placeholder="Enter quartermaster name"
            />
          </div>

          <div>
            <label htmlFor="date" className={secondaryLabelClass}>
              Checkout Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required={eventReady}
              className={secondaryFieldClass}
            />
          </div>
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{submitError}</p>
          </div>
        )}

        {isDesktop && (
          <button
            type="submit"
            disabled={!eventReady || loading}
            className="w-full h-12 text-base font-medium rounded-md bg-scout-blue/12 border border-scout-blue/20 text-scout-blue disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Complete Checkout'}
          </button>
        )}
      </form>
    </>
  );

  const cartSummaryCard = (
    <div className="sticky top-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Cart Summary
            <span className="ml-2 text-sm font-normal text-gray-500">
              {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}
            </span>
          </h2>
        </div>
        <div className="px-5 py-3 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {Object.entries(groupedItems).map(([classCode, group]) => (
            <div key={classCode} className="py-2 first:pt-0 last:pb-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {group.description}
                <span className="ml-1 text-gray-400">({group.items.length})</span>
              </p>
              <ul className="space-y-0.5">
                {group.items.map(item => (
                  <li key={item.itemId} className="text-sm text-gray-700 flex items-baseline gap-2">
                    <span className="font-medium text-scout-blue shrink-0">{item.itemId}</span>
                    {item.description && (
                      <span className="text-gray-500 truncate">{item.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ---- Desktop layout ---- */
  if (isDesktop) {
    return (
      <>
        <AnimateMain className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6 lg:grid lg:grid-cols-[1fr_22rem] lg:gap-6">
              <div>{formContent}</div>
              {cartSummaryCard}
            </div>
          </div>
        </AnimateMain>

        {/* Removed items warning modal */}
        {removedItemsWarning && (
          <div
            className="modal-dialog-overlay-root select-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-removed-items-title"
          >
            <div
              role="presentation"
              aria-hidden
              className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
              onClick={() => setRemovedItemsWarning(null)}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
              <div className="modal-dialog-panel-enter pointer-events-auto relative z-[101] w-full max-w-md rounded-2xl bg-white px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-10 shadow-2xl">
              <h2 id="checkout-removed-items-title" className="text-lg font-bold text-gray-900 mb-2">Items Not Being Checked Out</h2>
              <p className="text-sm text-gray-600 mb-4">
                The following {removedItemsWarning.length === 1 ? 'item was' : 'items were'} in your reservation but removed from the cart.{' '}
                {removedItemsWarning.length === 1 ? 'It' : 'They'} will be returned to available inventory:
              </p>
              <ul className="mb-5 space-y-1">
                {removedItemsWarning.map(item => (
                  <li key={item.itemId} className="text-sm font-medium text-gray-800">
                    {item.itemId} — {item.description}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                <button
                  onClick={() => setRemovedItemsWarning(null)}
                  className="flex-1 h-11 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
                >
                  Go Back
                </button>
                <button
                  onClick={() => { setRemovedItemsWarning(null); doCheckout(); }}
                  disabled={loading}
                  className="flex-1 h-11 rounded-md bg-scout-blue/12 border border-scout-blue/20 text-scout-blue text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm Checkout'}
                </button>
              </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ---- Mobile layout (unchanged) ---- */
  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <div className="header">
        <Link to="/cart" className="back-button no-underline">←</Link>
        <h1 className="text-center text-truncate">Checkout Information</h1>
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/cart" className="cart-badge no-underline">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cart-icon">
              <circle cx="8" cy="21" r="1"></circle>
              <circle cx="19" cy="21" r="1"></circle>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
            </svg>
            <span className="cart-count">{getTotalItems()}</span>
          </Link>
          <HeaderProfileMenu />
        </div>
      </div>

      <AnimateMain className="flex flex-1 flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-6 pb-20">
          {formContent}
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <button
          type="submit"
          form="checkout-form"
          disabled={!eventReady || loading}
          className="w-full h-12 text-base font-medium rounded-md bg-scout-blue/12 border border-scout-blue/20 text-scout-blue disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Complete Checkout'}
        </button>
      </div>
      </AnimateMain>

      {/* Removed items warning modal */}
      {removedItemsWarning && (
        <div
          className="modal-dialog-overlay-root select-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-removed-items-title-mobile"
        >
          <div
            role="presentation"
            aria-hidden
            className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
            onClick={() => setRemovedItemsWarning(null)}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
            <div className="modal-dialog-panel-enter pointer-events-auto relative z-[101] w-full max-w-md rounded-2xl bg-white px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-10 shadow-2xl">
            <h2 id="checkout-removed-items-title-mobile" className="text-lg font-bold text-gray-900 mb-2">Items Not Being Checked Out</h2>
            <p className="text-sm text-gray-600 mb-4">
              The following {removedItemsWarning.length === 1 ? 'item was' : 'items were'} in your reservation but removed from the cart.{' '}
              {removedItemsWarning.length === 1 ? 'It' : 'They'} will be returned to available inventory:
            </p>
            <ul className="mb-5 space-y-1">
              {removedItemsWarning.map(item => (
                <li key={item.itemId} className="text-sm font-medium text-gray-800">
                  {item.itemId} — {item.description}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setRemovedItemsWarning(null)}
                className="flex-1 h-11 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
              >
                Go Back
              </button>
              <button
                onClick={() => { setRemovedItemsWarning(null); doCheckout(); }}
                disabled={loading}
                className="flex-1 h-11 rounded-md bg-scout-blue/12 border border-scout-blue/20 text-scout-blue text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm Checkout'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
