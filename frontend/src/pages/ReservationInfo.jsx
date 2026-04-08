import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useReservations, useInventory } from '../hooks/useInventory';
import { useAuth } from '../context/AuthContext';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';

const ReservationInfo = () => {
  const navigate = useNavigate();
  const { items, clearCart, getTotalItems, reservationMeta } = useCart();
  const { postReservation, loading } = useReservations();
  const { getData, postData } = useInventory();
  const { user } = useAuth();

  const isEditing = reservationMeta?.isEditing === true;
  const userFullName = user ? `${user.first_name} ${user.last_name}` : '';

  const [formData, setFormData] = useState({
    eventId: reservationMeta?.eventId || '',
    reservedBy: reservationMeta?.reservedBy || userFullName,
    reservedEmail: reservationMeta?.reservedEmail || user?.email || '',
  });
  const [selectedEventName, setSelectedEventName] = useState(reservationMeta?.outingName || '');
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventTypes, setEventTypes] = useState([]);
  const [emailError, setEmailError] = useState('');
  const [submitError, setSubmitError] = useState(null);

  // New-event modal state
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventForm, setNewEventForm] = useState({ name: '', eventTypeId: 1, startDate: '' });
  const [newEventLoading, setNewEventLoading] = useState(false);
  const [newEventError, setNewEventError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setEventsLoading(true);
        const [eventsData, typesData] = await Promise.all([
          getData('/events'),
          getData('/events/types/list'),
        ]);
        setEvents(eventsData);
        setEventTypes(typesData);
        if (typesData.length > 0) {
          setNewEventForm(prev => ({ ...prev, eventTypeId: typesData[0].id }));
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchData();
  }, [getData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'reservedEmail') setEmailError('');
  };

  const handleEventSelect = (e) => {
    const eventId = e.target.value;
    const selected = events.find(ev => String(ev.id) === String(eventId));
    setFormData(prev => ({ ...prev, eventId }));
    setSelectedEventName(selected?.name || '');
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateEmail(formData.reservedEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    try {
      const itemIds = items.map(item => item.itemId);
      const result = await postReservation({
        itemIds,
        eventId: formData.eventId,
        reservedBy: formData.reservedBy,
        reservedEmail: formData.reservedEmail,
      });

      const count = result.successful?.length || getTotalItems();
      clearCart();
      navigate(`/reservation-success?count=${count}&outing=${encodeURIComponent(result.outingName || selectedEventName)}`);
    } catch (err) {
      setSubmitError(err.message || 'Failed to create reservation. Please try again.');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setNewEventError(null);
    if (!newEventForm.name.trim()) {
      setNewEventError('Event name is required');
      return;
    }
    try {
      setNewEventLoading(true);
      const created = await postData('/events', {
        name: newEventForm.name.trim(),
        eventTypeId: newEventForm.eventTypeId,
        startDate: newEventForm.startDate || null,
      });
      setEvents(prev => [created, ...prev]);
      setFormData(prev => ({ ...prev, eventId: String(created.id) }));
      setSelectedEventName(created.name);
      setShowNewEventModal(false);
      setNewEventForm({ name: '', eventTypeId: eventTypes[0]?.id || 1, startDate: '' });
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
            to="/categories?mode=reserve"
            className="inline-block bg-scout-orange/12 border border-scout-orange/20 text-scout-orange px-6 py-3 rounded-lg touch-target no-underline"
          >
            Browse Categories
          </Link>
        </div>
      </div>
    );
  }

  const formReady = formData.eventId && formData.reservedBy.trim() && formData.reservedEmail.trim();

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <div className="header header-reserve">
        <Link to="/cart?mode=reserve" className="back-button no-underline">←</Link>
        <h1 className="text-center text-truncate">Reservation Information</h1>
        <HeaderProfileMenu />
      </div>

      <AnimateMain className="flex flex-1 flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-6 pb-24">
          <div className="mb-5 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
            <p className="text-sm text-orange-800">
              {isEditing ? 'Updating' : 'Reserving'}{' '}
              <span className="font-bold">{getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}</span>
            </p>
          </div>

          <form id="reservation-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="eventId" className="block text-sm font-semibold text-gray-700 mb-2">
                Outing / Event *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={selectedEventName}
                  disabled
                  className="form-input w-full bg-gray-50 text-gray-500 cursor-not-allowed opacity-60"
                />
              ) : (
                <div className="flex gap-2">
                  <select
                    id="eventId"
                    name="eventId"
                    value={formData.eventId}
                    onChange={handleEventSelect}
                    required
                    className="form-input flex-1"
                  >
                    <option value="">
                      {eventsLoading ? 'Loading events…' : 'Select an event'}
                    </option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}{ev.startDate ? ` — ${new Date(ev.startDate + 'T00:00:00').toLocaleDateString()}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewEventModal(true)}
                    className="shrink-0 h-12 px-3 rounded-md bg-scout-orange/12 border border-scout-orange/20 text-scout-orange text-sm font-medium"
                    aria-label="Add new event"
                  >
                    + New
                  </button>
                </div>
              )}
              {isEditing && (
                <p className="mt-1 text-xs text-gray-500">Event cannot be changed when editing a reservation</p>
              )}
            </div>

            <div>
              <label htmlFor="reservedBy" className="block text-sm font-semibold text-gray-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                id="reservedBy"
                name="reservedBy"
                value={formData.reservedBy}
                onChange={handleChange}
                required
                disabled={!!user}
                className={`form-input w-full ${user ? 'bg-gray-50 text-gray-500 cursor-not-allowed opacity-60' : ''}`}
                placeholder="Outing leader name"
              />
            </div>

            <div>
              <label htmlFor="reservedEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="reservedEmail"
                name="reservedEmail"
                value={formData.reservedEmail}
                onChange={handleChange}
                required
                disabled={!!user}
                className={`form-input w-full ${user ? 'bg-gray-50 text-gray-500 cursor-not-allowed opacity-60' : ''}${emailError ? ' border-red-400' : ''}`}
                placeholder="e.g. leader@t222.org"
                autoComplete="email"
              />
              {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
            </div>
          </form>

          {submitError && (
            <div className="mt-5 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{submitError}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <button
          type="submit"
          form="reservation-form"
          disabled={!formReady || loading}
          className="w-full h-12 text-base font-medium rounded-md bg-scout-orange/12 border border-scout-orange/20 text-scout-orange disabled:opacity-50"
        >
          {loading ? 'Processing...' : isEditing ? 'Update Reservation' : 'Complete Reservation'}
        </button>
      </div>
      </AnimateMain>

      {/* New event modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Event</h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Event Name *</label>
                <input
                  type="text"
                  value={newEventForm.name}
                  onChange={e => setNewEventForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  autoFocus
                  className="form-input w-full"
                  placeholder="e.g. Summer Campout 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Event Type *</label>
                <select
                  value={newEventForm.eventTypeId}
                  onChange={e => setNewEventForm(prev => ({ ...prev, eventTypeId: parseInt(e.target.value, 10) }))}
                  className="form-input w-full"
                >
                  {eventTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date (Optional)</label>
                <input
                  type="date"
                  value={newEventForm.startDate}
                  onChange={e => setNewEventForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="form-input w-full"
                />
              </div>
              {newEventError && <p className="text-sm text-red-600">{newEventError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowNewEventModal(false); setNewEventError(null); }}
                  className="flex-1 h-11 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newEventLoading}
                  className="flex-1 h-11 rounded-md bg-scout-orange/12 border border-scout-orange/20 text-scout-orange text-sm font-medium disabled:opacity-50"
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

export default ReservationInfo;
