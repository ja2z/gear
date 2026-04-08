import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useInventory } from '../hooks/useInventory';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../config/apiBaseUrl';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';
import RosterSearchField from '../components/RosterSearchField';

const defaultDate = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

const Checkout = () => {
  const { items, clearCart, getTotalItems, reservationMeta } = useCart();
  const { postData, getData, loading } = useInventory();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const isDesktop = useIsDesktop();
  const fromReservation = reservationMeta?.fromReservation === true || locationState?.fromReservation === true;
  const userFullName = user ? `${user.first_name} ${user.last_name}` : '';

  useDesktopHeader({ title: 'Checkout Information' });

  const [formData, setFormData] = useState({
    eventId: reservationMeta?.eventId || locationState?.eventId || '',
    scoutName: reservationMeta?.scoutName || locationState?.scoutName || '',
    qmName: userFullName,
    date: defaultDate(),
    notes: '',
  });
  const [selectedEventName, setSelectedEventName] = useState(
    reservationMeta?.outingName || locationState?.outingName || ''
  );
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [removedItemsWarning, setRemovedItemsWarning] = useState(null);

  // New-event modal state
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventForm, setNewEventForm] = useState({ name: '', eventTypeId: 1, startDate: '', endDate: '', eventSplId: '', adultLeaderId: '' });
  const [eventTypes, setEventTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [newEventLoading, setNewEventLoading] = useState(false);
  const [newEventError, setNewEventError] = useState(null);
  const [newEventLeaderSearch, setNewEventLeaderSearch] = useState('');
  const [newEventAdultLeaderSearch, setNewEventAdultLeaderSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setEventsLoading(true);
        const [eventsData, typesData, usersData] = await Promise.all([
          getData('/events'),
          getData('/events/types/list'),
          getData('/events/users/list'),
        ]);
        setEvents(eventsData);
        setEventTypes(typesData);
        setUsers(usersData);
        if (typesData.length > 0) {
          setNewEventForm(prev => ({ ...prev, eventTypeId: typesData[0].id }));
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setSubmitError('Failed to load events');
      } finally {
        setEventsLoading(false);
      }
    };
    fetchData();
  }, [getData]);

  const eventReady = !!formData.eventId;
  const secondaryLocked = !eventReady;

  const secondaryFieldClass = secondaryLocked
    ? 'form-input bg-gray-50 text-gray-500 cursor-not-allowed opacity-60'
    : 'form-input';
  const secondaryLabelClass = secondaryLocked
    ? 'block text-sm font-medium text-gray-400 mb-2'
    : 'block text-sm font-semibold text-gray-700 mb-2';

  const handleEventSelect = (e) => {
    const eventId = e.target.value;
    if (!eventId) {
      setFormData(prev => ({ ...prev, eventId: '', scoutName: '', notes: '', date: defaultDate() }));
      setSelectedEventName('');
      return;
    }
    const selected = events.find(ev => String(ev.id) === String(eventId));
    setFormData(prev => ({
      ...prev,
      eventId,
      scoutName: selected?.eventSplName || prev.scoutName || '',
      notes: '',
      date: defaultDate(),
    }));
    setSelectedEventName(selected?.name || '');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const doCheckout = async () => {
    setSubmitError(null);
    try {
      const itemIds = items.map(item => item.itemId);
      const checkoutData = {
        itemIds,
        scoutName: formData.scoutName,
        eventId: formData.eventId,
        processedBy: formData.qmName,
        notes: formData.notes,
      };

      const result = await postData('/checkout', checkoutData);

      if (result.success) {
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
        clearCart();
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

  const scouts = users.filter(u => !u.isAdult);
  const adults = users.filter(u => u.isAdult);
  const newEventIsOvernight = eventTypes.find(t => t.id === parseInt(newEventForm.eventTypeId, 10))?.type === 'Overnight Outing';

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setNewEventError(null);
    if (!newEventForm.name.trim()) {
      setNewEventError('Event name is required');
      return;
    }
    if (!newEventForm.startDate) {
      setNewEventError('Start date is required');
      return;
    }
    if (newEventIsOvernight && !newEventForm.endDate) {
      setNewEventError('End date is required for overnight outings');
      return;
    }
    if (!newEventForm.eventSplId) {
      setNewEventError('Outing leader is required');
      return;
    }
    if (!newEventForm.adultLeaderId) {
      setNewEventError('Adult leader is required');
      return;
    }
    try {
      setNewEventLoading(true);
      const created = await postData('/events', {
        name: newEventForm.name.trim(),
        eventTypeId: newEventForm.eventTypeId,
        startDate: newEventForm.startDate,
        endDate: newEventIsOvernight ? (newEventForm.endDate || null) : null,
        eventSplId: newEventForm.eventSplId || null,
        eventAsplId: null,
        adultLeaderId: newEventForm.adultLeaderId || null,
      });
      setEvents(prev => [created, ...prev]);
      setFormData(prev => ({ ...prev, eventId: String(created.id), scoutName: created.eventSplName || prev.scoutName }));
      setSelectedEventName(created.name);
      setShowNewEventModal(false);
      setNewEventLeaderSearch('');
      setNewEventAdultLeaderSearch('');
      setNewEventForm({ name: '', eventTypeId: eventTypes[0]?.id || 1, startDate: '', endDate: '', eventSplId: '', adultLeaderId: '' });
    } catch (err) {
      setNewEventError(err.message || 'Failed to create event');
    } finally {
      setNewEventLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No items in cart</h2>
          <Link
            to="/categories"
            className="inline-block bg-scout-blue/12 border border-scout-blue/20 text-scout-blue px-6 py-3 rounded-lg hover:bg-scout-blue/18 transition-colors touch-target no-underline"
          >
            Browse Categories
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
            Checking out reserved gear for <span className="font-bold">{selectedEventName}</span>
          </p>
        </div>
      )}

      <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-5">
          {/* Event selector */}
          <div>
            <label htmlFor="eventId" className="block text-sm font-semibold text-gray-700 mb-2">
              Outing / Event *
            </label>
            <div className="flex gap-2">
              <select
                id="eventId"
                name="eventId"
                value={formData.eventId}
                onChange={handleEventSelect}
                required
                disabled={fromReservation}
                className={`form-input flex-1 ${fromReservation ? 'bg-gray-50 text-gray-500 cursor-not-allowed opacity-60' : ''}`}
              >
                <option value="">
                  {eventsLoading ? 'Loading events…' : 'Select an event'}
                </option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}{ev.startDate ? ` — ${new Date(ev.startDate).toLocaleDateString()}` : ''}
                  </option>
                ))}
              </select>
              {!fromReservation && (
                <button
                  type="button"
                  onClick={() => {
                    setNewEventLeaderSearch('');
                    setNewEventAdultLeaderSearch('');
                    setShowNewEventModal(true);
                  }}
                  className="shrink-0 h-12 px-3 rounded-md bg-scout-blue/12 border border-scout-blue/20 text-scout-blue text-sm font-medium"
                  aria-label="Add new event"
                >
                  + New
                </button>
              )}
            </div>
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
              disabled={secondaryLocked}
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
              disabled={user ? true : secondaryLocked}
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
              disabled={secondaryLocked}
              required={eventReady}
              className={secondaryFieldClass}
            />
          </div>

          <div>
            <label htmlFor="notes" className={secondaryLabelClass}>
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              disabled={secondaryLocked}
              rows={3}
              className={secondaryFieldClass}
              placeholder="Any special notes or instructions..."
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <button
              type="button"
              className="modal-dialog-backdrop-enter absolute inset-0 bg-black/45"
              aria-label="Close"
              onClick={() => setRemovedItemsWarning(null)}
            />
            <div className="modal-dialog-panel-enter relative z-[101] w-full max-w-md rounded-2xl bg-white px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-10 shadow-2xl">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Items Not Being Checked Out</h2>
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
        )}

        {/* New event modal */}
        {showNewEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <button
              type="button"
              className="modal-dialog-backdrop-enter absolute inset-0 bg-black/45"
              aria-label="Close"
            onClick={() => { setShowNewEventModal(false); setNewEventError(null); setNewEventLeaderSearch(''); setNewEventAdultLeaderSearch(''); }}
          />
            <div className="modal-dialog-panel-enter relative z-[101] max-h-[min(90dvh,42rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-10 shadow-2xl">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Event</h2>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Event Name *</label>
                  <input
                    type="text"
                    value={newEventForm.name}
                    onChange={e => setNewEventForm(prev => ({ ...prev, name: e.target.value }))}
                    autoFocus
                    className="form-input w-full"
                    placeholder="e.g. Spring Campout 2026"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Event Type *</label>
                  <select
                    value={newEventForm.eventTypeId}
                    onChange={e => setNewEventForm(prev => ({ ...prev, eventTypeId: parseInt(e.target.value, 10), endDate: '' }))}
                    className="form-input w-full"
                  >
                    {eventTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={newEventForm.startDate}
                    onChange={e => setNewEventForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    End Date {newEventIsOvernight ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="date"
                    value={newEventForm.endDate}
                    min={newEventForm.startDate || undefined}
                    onChange={e => setNewEventForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label htmlFor="outing-leader-checkout-desktop" className="block text-sm font-semibold text-gray-700 mb-1">
                    Outing leader *
                  </label>
                  <RosterSearchField
                    fieldId="outing-leader-checkout-desktop"
                    users={scouts}
                    value={newEventForm.eventSplId}
                    onChange={(id) => setNewEventForm((prev) => ({ ...prev, eventSplId: id }))}
                    searchText={newEventLeaderSearch}
                    onSearchTextChange={setNewEventLeaderSearch}
                    disabled={newEventLoading}
                  />
                </div>
                <div>
                  <label htmlFor="adult-leader-checkout-desktop" className="block text-sm font-semibold text-gray-700 mb-1">Adult Leader *</label>
                  <RosterSearchField
                    fieldId="adult-leader-checkout-desktop"
                    users={adults}
                    value={newEventForm.adultLeaderId}
                    onChange={(id) => setNewEventForm((prev) => ({ ...prev, adultLeaderId: id }))}
                    searchText={newEventAdultLeaderSearch}
                    onSearchTextChange={setNewEventAdultLeaderSearch}
                    disabled={newEventLoading}
                  />
                </div>
                {newEventError && (
                  <p className="text-sm text-red-600">{newEventError}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowNewEventModal(false); setNewEventError(null); setNewEventLeaderSearch(''); setNewEventAdultLeaderSearch(''); }}
                    className="flex-1 h-11 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={newEventLoading}
                    className="flex-1 h-11 rounded-md bg-scout-blue/12 border border-scout-blue/20 text-scout-blue text-sm font-medium disabled:opacity-50"
                  >
                    {newEventLoading ? 'Creating…' : 'Create Event'}
                  </button>
                </div>
              </form>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            className="modal-dialog-backdrop-enter absolute inset-0 bg-black/45"
            aria-label="Close"
            onClick={() => setRemovedItemsWarning(null)}
          />
          <div className="modal-dialog-panel-enter relative z-[101] w-full max-w-md rounded-2xl bg-white px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-10 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Items Not Being Checked Out</h2>
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
      )}

      {/* New event modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            className="modal-dialog-backdrop-enter absolute inset-0 bg-black/45"
            aria-label="Close"
            onClick={() => { setShowNewEventModal(false); setNewEventError(null); setNewEventLeaderSearch(''); setNewEventAdultLeaderSearch(''); }}
          />
            <div className="modal-dialog-panel-enter relative z-[101] max-h-[min(90dvh,42rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-10 shadow-2xl">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Event</h2>
              <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Event Name *</label>
                <input
                  type="text"
                  value={newEventForm.name}
                  onChange={e => setNewEventForm(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                  className="form-input w-full"
                  placeholder="e.g. Spring Campout 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Event Type *</label>
                <select
                  value={newEventForm.eventTypeId}
                  onChange={e => setNewEventForm(prev => ({ ...prev, eventTypeId: parseInt(e.target.value, 10), endDate: '' }))}
                  className="form-input w-full"
                >
                  {eventTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={newEventForm.startDate}
                  onChange={e => setNewEventForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  End Date {newEventIsOvernight ? '*' : '(Optional)'}
                </label>
                <input
                  type="date"
                  value={newEventForm.endDate}
                  min={newEventForm.startDate || undefined}
                  onChange={e => setNewEventForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label htmlFor="outing-leader-checkout-mobile" className="block text-sm font-semibold text-gray-700 mb-1">
                  Outing leader *
                </label>
                <RosterSearchField
                  fieldId="outing-leader-checkout-mobile"
                  users={scouts}
                  value={newEventForm.eventSplId}
                  onChange={(id) => setNewEventForm((prev) => ({ ...prev, eventSplId: id }))}
                  searchText={newEventLeaderSearch}
                  onSearchTextChange={setNewEventLeaderSearch}
                  disabled={newEventLoading}
                />
              </div>
              <div>
                <label htmlFor="adult-leader-checkout-mobile" className="block text-sm font-semibold text-gray-700 mb-1">Adult Leader *</label>
                <RosterSearchField
                  fieldId="adult-leader-checkout-mobile"
                  users={adults}
                  value={newEventForm.adultLeaderId}
                  onChange={(id) => setNewEventForm((prev) => ({ ...prev, adultLeaderId: id }))}
                  searchText={newEventAdultLeaderSearch}
                  onSearchTextChange={setNewEventAdultLeaderSearch}
                  disabled={newEventLoading}
                />
              </div>
              {newEventError && (
                <p className="text-sm text-red-600">{newEventError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowNewEventModal(false); setNewEventError(null); setNewEventLeaderSearch(''); setNewEventAdultLeaderSearch(''); }}
                  className="flex-1 h-11 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newEventLoading}
                  className="flex-1 h-11 rounded-md bg-scout-blue/12 border border-scout-blue/20 text-scout-blue text-sm font-medium disabled:opacity-50"
                >
                  {newEventLoading ? 'Creating…' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
