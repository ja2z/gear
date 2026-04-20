import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Loader2, Plus, X } from 'lucide-react';
import { AnimateMain, SegmentSwitchAnimate } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import { useInventory } from '../hooks/useInventory';
import { useCart } from '../context/CartContext';
import { getApiBaseUrl } from '../config/apiBaseUrl';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';
import RosterSearchField from '../components/RosterSearchField';
import OutingDatePicker from '../components/OutingDatePicker';
import OutingListCard from '../components/OutingListCard';
import { isoToLocalDateTimeParts } from '../utils/outingFormat';
import SegmentedControl from '../components/SegmentedControl';
import { filterAndSortOutings, UPCOMING_BUFFER_DAYS } from '../utils/outingFilters';
import { primaryLeaderLabel } from '../utils/eventLabels';

const OUTING_LIST_TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
];

/** Must match input exactly (after trim) to enable destructive delete. */
const DELETE_CONFIRM_PHRASE = 'CONFIRM';

const US_TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific — Los Angeles' },
  { value: 'America/Denver',      label: 'Mountain — Denver' },
  { value: 'America/Chicago',     label: 'Central — Chicago' },
  { value: 'America/New_York',    label: 'Eastern — New York' },
  { value: 'America/Anchorage',   label: 'Alaska — Anchorage' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii — Honolulu' },
];

const defaultForm = {
  name: '',
  eventTypeId: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  timezone: 'America/Los_Angeles',
  eventSplId: '',
  adultLeaderId: '',
};

const OutingsPage = () => {
  const { getData } = useInventory();
  const { checkoutEvent, reservationMeta, mergeReservationMeta, setCheckoutEvent } = useCart();
  const isDesktop = useIsDesktop();
  const reservationMetaRef = useRef(reservationMeta);
  reservationMetaRef.current = reservationMeta;
  const checkoutEventRef = useRef(checkoutEvent);
  checkoutEventRef.current = checkoutEvent;

  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  /** True while exit animation plays; modal stays mounted until it finishes. */
  const [formModalClosing, setFormModalClosing] = useState(false);
  const formExitHandledRef = useRef(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [outingLeaderSearch, setOutingLeaderSearch] = useState('');
  const [adultLeaderSearch, setAdultLeaderSearch] = useState('');

  const [deletingEvent, setDeletingEvent] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  /** Upcoming = ending on/after (today − buffer); Past = older. Default tab: upcoming. */
  const [outingListFilter, setOutingListFilter] = useState('upcoming');

  const filteredSortedEvents = useMemo(
    () => filterAndSortOutings(events, outingListFilter, UPCOMING_BUFFER_DAYS),
    [events, outingListFilter],
  );

  const fetchAll = useCallback(async () => {
    try {
      setPageLoading(true);
      setPageError(null);
      const [eventsData, typesData, usersData] = await Promise.all([
        getData('/events'),
        getData('/events/types/list'),
        getData('/events/users/list'),
      ]);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setEventTypes(Array.isArray(typesData) ? typesData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      setPageError('Failed to load events');
    } finally {
      setPageLoading(false);
    }
  }, [getData]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /** Backfill event type for cart banner (same idea as Categories reserve flow). */
  useEffect(() => {
    if (!reservationMeta?.eventId || reservationMeta?.eventType) return;
    let cancelled = false;
    const id = reservationMeta.eventId;
    getData(`/events/${id}`)
      .then((ev) => {
        if (cancelled || !ev?.eventType) return;
        const prev = reservationMetaRef.current;
        if (!prev || String(prev.eventId) !== String(id)) return;
        mergeReservationMeta({ eventType: ev.eventType });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reservationMeta?.eventId, reservationMeta?.eventType, getData, mergeReservationMeta]);

  /** Backfill event type for checkout banner (same idea as reservation above). */
  useEffect(() => {
    if (!checkoutEvent?.eventId || checkoutEvent?.eventType) return;
    let cancelled = false;
    const id = checkoutEvent.eventId;
    getData(`/events/${id}`)
      .then((ev) => {
        if (cancelled || !ev?.eventType) return;
        const prev = checkoutEventRef.current;
        if (!prev || String(prev.eventId) !== String(id)) return;
        setCheckoutEvent({ ...prev, eventType: ev.eventType });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [checkoutEvent?.eventId, checkoutEvent?.eventType, getData, setCheckoutEvent]);

  const usersList = Array.isArray(users) ? users : [];
  const eventTypesList = Array.isArray(eventTypes) ? eventTypes : [];
  const scouts = usersList.filter((u) => !u.isAdult);
  const adults = usersList.filter((u) => u.isAdult);

  const matchedEventType = useMemo(() => {
    if (form.eventTypeId === '' || form.eventTypeId == null) return undefined;
    const n = Number(form.eventTypeId);
    if (Number.isNaN(n)) return undefined;
    return eventTypesList.find((t) => Number(t.id) === n);
  }, [eventTypesList, form.eventTypeId]);

  const splLeaderFieldLabel = primaryLeaderLabel(matchedEventType?.type);

  const isOutingFormValid = useMemo(() => {
    if (!form.name?.trim()) return false;
    if (form.eventTypeId === '' || form.eventTypeId == null) return false;
    if (Number.isNaN(parseInt(form.eventTypeId, 10))) return false;
    if (!form.startDate) return false;
    if (form.endDate && form.endDate < form.startDate) return false;
    if (!form.eventSplId) return false;
    if (!form.adultLeaderId) return false;
    return true;
  }, [
    form.name,
    form.eventTypeId,
    form.startDate,
    form.endDate,
    form.eventSplId,
    form.adultLeaderId,
  ]);

  const finishCloseFormModal = useCallback(() => {
    if (formExitHandledRef.current) return;
    formExitHandledRef.current = true;
    setShowModal(false);
    setFormModalClosing(false);
    setOutingLeaderSearch('');
    setAdultLeaderSearch('');
    setModalError(null);
  }, []);

  const requestCloseFormModal = useCallback(() => {
    if (formModalClosing) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishCloseFormModal();
      return;
    }
    formExitHandledRef.current = false;
    setFormModalClosing(true);
  }, [formModalClosing, finishCloseFormModal]);

  useEffect(() => {
    if (!formModalClosing) return;
    const id = setTimeout(() => {
      finishCloseFormModal();
    }, 450);
    return () => clearTimeout(id);
  }, [formModalClosing, finishCloseFormModal]);

  const handleFormModalPanelAnimationEnd = (e) => {
    if (!formModalClosing) return;
    if (e.target !== e.currentTarget) return;
    finishCloseFormModal();
  };

  const openCreate = () => {
    formExitHandledRef.current = false;
    setFormModalClosing(false);
    setEditingEvent(null);
    setForm({ ...defaultForm, eventTypeId: eventTypesList[0]?.id ?? '' });
    setOutingLeaderSearch('');
    setAdultLeaderSearch('');
    setModalError(null);
    setShowModal(true);
  };

  const openEdit = (ev) => {
    formExitHandledRef.current = false;
    setFormModalClosing(false);
    setEditingEvent(ev);
    const tz = ev.timezone || 'America/Los_Angeles';
    const { date: startDate, time: startTime } = isoToLocalDateTimeParts(ev.startDate, tz);
    const { date: endDate, time: endTime } = isoToLocalDateTimeParts(ev.endDate, tz);
    setForm({
      name: ev.name,
      eventTypeId: ev.eventTypeId,
      startDate,
      startTime,
      endDate,
      endTime,
      timezone: tz,
      eventSplId: ev.eventSplId || '',
      adultLeaderId: ev.adultLeaderId || '',
    });
    const splUser = users.find((u) => String(u.id) === String(ev.eventSplId));
    const adultUser = users.find((u) => String(u.id) === String(ev.adultLeaderId));
    setOutingLeaderSearch(splUser?.fullName ?? ev.eventSplName ?? '');
    setAdultLeaderSearch(adultUser?.fullName ?? ev.adultLeaderName ?? '');
    setModalError(null);
    setShowModal(true);
  };

  const handleFormChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'startDate' && next.endDate && value > next.endDate) next.endDate = value;
      if (field === 'endDate' && next.startDate && value < next.startDate) next.startDate = value;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!form.name.trim()) { setModalError('Event name is required'); return; }
    if (!form.startDate) { setModalError('Start date is required'); return; }
    if (form.endDate && form.startDate && form.endDate < form.startDate) {
      setModalError('End date must be on or after start date');
      return;
    }
    if (!form.eventSplId) { setModalError(`${splLeaderFieldLabel} is required`); return; }
    if (!form.adultLeaderId) { setModalError('Adult leader is required'); return; }

    const payload = {
      name: form.name.trim(),
      eventTypeId: parseInt(form.eventTypeId, 10),
      startDate: form.startDate,
      startTime: form.startTime || null,
      endDate: form.endDate || null,
      endTime: form.endTime || null,
      timezone: form.timezone || 'America/Los_Angeles',
      eventSplId: form.eventSplId || null,
      eventAsplId: null,
      adultLeaderId: form.adultLeaderId || null,
    };

    try {
      setModalLoading(true);
      const url = editingEvent
        ? `${getApiBaseUrl()}/events/${editingEvent.id}`
        : `${getApiBaseUrl()}/events`;
      const method = editingEvent ? 'PUT' : 'POST';
      const resp = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
      }
      const saved = await resp.json();
      if (editingEvent) {
        setEvents(prev => prev.map(ev => ev.id === saved.id ? saved : ev));
      } else {
        setEvents(prev => [saved, ...prev]);
      }
      requestCloseFormModal();
    } catch (err) {
      setModalError(err.message || 'Failed to save event');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEvent) return;
    if (deleteConfirmText.trim() !== DELETE_CONFIRM_PHRASE) return;
    setDeleteError(null);
    try {
      setDeleteLoading(true);
      const resp = await fetch(`${getApiBaseUrl()}/events/${deletingEvent.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Delete failed');
      }
      setEvents(prev => prev.filter(ev => ev.id !== deletingEvent.id));
      setDeletingEvent(null);
      setDeleteConfirmText('');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete event');
    } finally {
      setDeleteLoading(false);
    }
  };

  useDesktopHeader({
    title: 'Events',
    subtitle: 'Plan & manage trips',
    headerRight: null,
  });

  const loadingOrError = (
    <>
      {pageLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16" role="status" aria-live="polite">
          <Loader2 className="h-9 w-9 animate-spin text-scout-blue/50" aria-hidden />
          <p className="text-sm text-gray-500">Loading events…</p>
        </div>
      )}
      {pageError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">{pageError}</div>
      )}
      {!pageLoading && !pageError && events.length === 0 && (
        <div className="mx-auto w-full max-w-lg rounded-2xl border border-dashed border-gray-200/90 bg-white px-6 py-10 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-900">No events yet</p>
          <p className="mt-2 text-sm text-gray-600">
            Add campouts, hikes, and meetings so scouts and adults can plan gear and dates in one place.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-scout-blue px-5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-scout-blue/90 touch-target"
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Create your first event
          </button>
        </div>
      )}
    </>
  );

  const outingListToolbar =
    !pageLoading &&
    !pageError &&
    events.length > 0 && (
      <div className="flex w-full items-center gap-2">
        <div className="min-w-0 flex-1">
          <SegmentedControl tabs={OUTING_LIST_TABS} value={outingListFilter} onChange={setOutingListFilter} />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-300/90 bg-white text-scout-blue/38 shadow-sm transition-colors hover:border-scout-blue/22 hover:bg-scout-blue/[0.06] hover:text-scout-blue/60 active:bg-scout-blue/[0.09]"
          aria-label="New event"
        >
          <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
      </div>
    );

  /** List + empty state for the active Upcoming/Past tab — animates on segment change. */
  const eventsSegmentContent =
    !pageLoading &&
    !pageError &&
    events.length > 0 && (
      <SegmentSwitchAnimate key={outingListFilter} className="block">
        {filteredSortedEvents.length === 0 ? (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-gray-200/90 bg-white px-4 py-10 text-center shadow-sm">
            <p className="text-sm text-gray-600">
              {outingListFilter === 'upcoming'
                ? 'No events in this window. Try Past for earlier trips, or create a new event.'
                : 'No past events to show yet. Switch to Upcoming for current and future trips.'}
            </p>
          </div>
        ) : (
          <section aria-label="Events list">
            <ul className="m-0 flex list-none flex-col gap-3 p-0 sm:gap-4">
              {filteredSortedEvents.map((ev) => (
                <li key={ev.id} className="m-0 p-0">
                  <OutingListCard
                    ev={ev}
                    onEdit={() => openEdit(ev)}
                    onDelete={() => {
                      setDeletingEvent(ev);
                      setDeleteConfirmText('');
                      setDeleteError(null);
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </SegmentSwitchAnimate>
    );

  const formModal = showModal && (
    <div
      className="modal-dialog-overlay-root select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-form-modal-title"
    >
      <div
        role="presentation"
        aria-hidden
        className={`modal-dialog-backdrop-surface ${formModalClosing ? 'modal-dialog-backdrop-exit' : 'modal-dialog-backdrop-enter'}`}
        onClick={requestCloseFormModal}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div
          className={`pointer-events-auto relative z-[101] flex max-h-[92dvh] w-full max-w-[22rem] flex-col overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-2xl sm:max-w-[23rem] ${formModalClosing ? 'modal-dialog-panel-exit' : 'modal-dialog-panel-enter'}`}
          onAnimationEnd={handleFormModalPanelAnimationEnd}
        >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-1.5 sm:px-3.5">
          <h2 id="event-form-modal-title" className="text-sm font-bold leading-tight text-gray-900 sm:text-[15px]">
            {editingEvent ? 'Edit event' : 'New event'}
          </h2>
          <button
            type="button"
            onClick={requestCloseFormModal}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col"
        >
          <div
            className="relative z-30 space-y-4 px-3 pt-2.5 pb-3 sm:space-y-5 sm:px-4 sm:pt-3 sm:pb-4 [&_button.form-input]:!h-10 [&_button.form-input]:!min-h-10 [&_button.form-input]:!py-2 [&_input.form-input]:!h-10 [&_input.form-input]:!min-h-10 [&_input.form-input]:!py-2 [&_input.search-input]:!min-h-10 [&_input.search-input]:!py-2 [&_input.search-input]:!px-3 [&_select.form-input]:!h-10 [&_select.form-input]:!min-h-10 [&_select.form-input]:!py-2"
          >
          <div className="flex flex-col gap-0.5">
            <label className="block text-xs font-semibold leading-tight text-gray-700 sm:text-sm">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              className="form-input w-full"
              placeholder="e.g. Spring Campout 2026"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="block text-xs font-semibold leading-tight text-gray-700 sm:text-sm">Type *</label>
            <select value={form.eventTypeId} onChange={e => handleFormChange('eventTypeId', parseInt(e.target.value, 10))} className="form-input w-full">
              {eventTypesList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label htmlFor="outing-start-date" className="block text-xs font-semibold leading-tight text-gray-700 sm:text-sm">
                  Start date *
                </label>
                <OutingDatePicker
                  id="outing-start-date"
                  value={form.startDate}
                  onChange={(v) => handleFormChange('startDate', v)}
                  disabled={modalLoading}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label htmlFor="outing-end-date" className="block text-xs font-semibold leading-tight text-gray-700 sm:text-sm">
                  End date
                </label>
                <OutingDatePicker
                  id="outing-end-date"
                  value={form.endDate}
                  onChange={(v) => handleFormChange('endDate', v)}
                  minDate={form.startDate || undefined}
                  disabled={modalLoading}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label htmlFor="outing-start-time" className="block text-xs font-semibold leading-tight text-gray-700 sm:text-sm">
                  Start time
                </label>
                <input
                  type="time"
                  id="outing-start-time"
                  value={form.startTime}
                  onChange={(e) => handleFormChange('startTime', e.target.value)}
                  disabled={modalLoading}
                  className="form-input w-full cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label htmlFor="outing-end-time" className="block text-xs font-semibold leading-tight text-gray-700 sm:text-sm">
                  End time
                </label>
                <input
                  type="time"
                  id="outing-end-time"
                  value={form.endTime}
                  onChange={(e) => handleFormChange('endTime', e.target.value)}
                  disabled={modalLoading}
                  className="form-input w-full cursor-pointer"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <label htmlFor="outing-timezone" className="block text-xs font-semibold leading-tight text-gray-700 sm:text-sm">
              Timezone
            </label>
            <select
              id="outing-timezone"
              value={form.timezone}
              onChange={(e) => handleFormChange('timezone', e.target.value)}
              disabled={modalLoading}
              className="form-input w-full"
            >
              {US_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label htmlFor="event-spl-leader" className="block text-xs font-semibold leading-tight text-gray-700 sm:text-sm">
              {splLeaderFieldLabel} *
            </label>
            <RosterSearchField
              fieldId="event-spl-leader"
              users={scouts}
              value={form.eventSplId}
              onChange={(id) => handleFormChange('eventSplId', id)}
              searchText={outingLeaderSearch}
              onSearchTextChange={setOutingLeaderSearch}
              disabled={modalLoading}
              compact
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label htmlFor="event-adult-leader" className="block text-xs font-semibold leading-tight text-gray-700 sm:text-sm">Adult leader *</label>
            <RosterSearchField
              fieldId="event-adult-leader"
              users={adults}
              value={form.adultLeaderId}
              onChange={(id) => handleFormChange('adultLeaderId', id)}
              searchText={adultLeaderSearch}
              onSearchTextChange={setAdultLeaderSearch}
              disabled={modalLoading}
              compact
            />
          </div>
          {modalError && <p className="text-sm leading-snug text-red-600">{modalError}</p>}
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-100 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3.5 sm:px-4 sm:pt-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={requestCloseFormModal}
              className="flex h-11 min-h-11 flex-1 items-center justify-center rounded-md border border-gray-300 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading || !isOutingFormValid}
              className="flex h-11 min-h-11 flex-1 items-center justify-center rounded-md border text-sm font-medium transition-colors disabled:cursor-not-allowed bg-scout-blue/12 border-scout-blue/20 text-scout-blue enabled:hover:bg-scout-blue/18 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-100"
            >
              {modalLoading ? 'Saving…' : (editingEvent ? 'Save changes' : 'Create event')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );

  const closeDeleteModal = () => {
    setDeletingEvent(null);
    setDeleteConfirmText('');
    setDeleteError(null);
  };

  const deleteModal = deletingEvent && (
    <div
      className="modal-dialog-overlay-root select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-delete-modal-title"
    >
      <div
        role="presentation"
        aria-hidden
        className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
        onClick={closeDeleteModal}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div className="modal-dialog-panel-enter pointer-events-auto relative z-[101] flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="max-h-[min(70dvh,calc(100dvh-6rem))] overflow-y-auto overscroll-contain px-5 pt-5">
        <h2 id="event-delete-modal-title" className="mb-1 text-base font-bold text-gray-900 sm:text-lg">Delete event?</h2>
        <p className="mb-3 text-sm leading-snug text-gray-600">
          This will permanently delete <span className="font-semibold">{deletingEvent.name}</span> and cannot be undone.
          Any gear still checked out for this event will be returned to inventory.
          Transaction history will be preserved but will lose the event link.
        </p>
        <p className="mb-1.5 text-sm font-semibold text-gray-700">Type <span className="font-mono text-gray-900">CONFIRM</span> to delete:</p>
        <input
          type="text"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="CONFIRM"
          className="form-input mb-2 w-full"
          aria-label="Type CONFIRM to delete this event"
        />
        {deleteError && <p className="mb-0 text-sm text-red-600">{deleteError}</p>}
        </div>
        <div className="flex shrink-0 gap-3 border-t border-gray-100 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          <button type="button" onClick={closeDeleteModal} className="flex-1 h-11 rounded-md border border-gray-300 text-sm font-medium text-gray-700">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteLoading || deleteConfirmText.trim() !== DELETE_CONFIRM_PHRASE}
            className="flex-1 h-11 rounded-md bg-red-500 text-sm font-medium text-white disabled:opacity-30"
          >
            {deleteLoading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 px-6 py-6">
        {loadingOrError}
        {outingListToolbar}
        {eventsSegmentContent}
        {formModal ? createPortal(formModal, document.body) : null}
        {deleteModal ? createPortal(deleteModal, document.body) : null}
      </div>
    );
  }

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <div className="header">
        <Link to="/home" className="back-button no-underline">←</Link>
        <h1>Events</h1>
        <div className="flex shrink-0 items-center gap-2">
          <HeaderProfileMenu />
        </div>
      </div>

      <AnimateMain className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 px-5 py-5 pb-8">
            {loadingOrError}
            {outingListToolbar}
            {eventsSegmentContent}
          </div>
        </div>
      </AnimateMain>

      {formModal ? createPortal(formModal, document.body) : null}
      {deleteModal ? createPortal(deleteModal, document.body) : null}
    </div>
  );
};

export default OutingsPage;
