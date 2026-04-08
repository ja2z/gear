import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Loader2, Plus, X } from 'lucide-react';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import { useInventory } from '../hooks/useInventory';
import { getApiBaseUrl } from '../config/apiBaseUrl';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';
import RosterSearchField from '../components/RosterSearchField';
import OutingDatePicker from '../components/OutingDatePicker';
import OutingListCard from '../components/OutingListCard';
import SegmentedControl from '../components/SegmentedControl';
import { filterAndSortOutings, UPCOMING_BUFFER_DAYS } from '../utils/outingFilters';

const OUTING_LIST_TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
];

const defaultForm = {
  name: '',
  eventTypeId: '',
  startDate: '',
  endDate: '',
  eventSplId: '',
  adultLeaderId: '',
};

const OutingsPage = () => {
  const { getData } = useInventory();
  const isDesktop = useIsDesktop();

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
      setEvents(eventsData);
      setEventTypes(typesData);
      setUsers(usersData);
    } catch (err) {
      setPageError('Failed to load outings');
    } finally {
      setPageLoading(false);
    }
  }, [getData]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const scouts = users.filter(u => !u.isAdult);
  const adults = users.filter(u => u.isAdult);
  const isOvernight = eventTypes.find(t => t.id === parseInt(form.eventTypeId, 10))?.type === 'Overnight Outing';

  const isOutingFormValid = useMemo(() => {
    if (!form.name?.trim()) return false;
    if (form.eventTypeId === '' || form.eventTypeId == null) return false;
    if (Number.isNaN(parseInt(form.eventTypeId, 10))) return false;
    if (!form.startDate) return false;
    if (isOvernight) {
      if (!form.endDate) return false;
      if (form.endDate < form.startDate) return false;
    }
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
    isOvernight,
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
    setForm({ ...defaultForm, eventTypeId: eventTypes[0]?.id || '' });
    setOutingLeaderSearch('');
    setAdultLeaderSearch('');
    setModalError(null);
    setShowModal(true);
  };

  const openEdit = (ev) => {
    formExitHandledRef.current = false;
    setFormModalClosing(false);
    setEditingEvent(ev);
    setForm({
      name: ev.name,
      eventTypeId: ev.eventTypeId,
      startDate: ev.startDate || '',
      endDate: ev.endDate || '',
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
    setForm(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'eventTypeId' ? { endDate: '' } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!form.name.trim()) { setModalError('Event name is required'); return; }
    if (!form.startDate) {
      setModalError(isOvernight ? 'Start date is required' : 'Date is required');
      return;
    }
    if (isOvernight && !form.endDate) { setModalError('End date is required for overnight outings'); return; }
    if (isOvernight && form.endDate && form.startDate && form.endDate < form.startDate) {
      setModalError('End date must be on or after start date');
      return;
    }
    if (!form.eventSplId)   { setModalError('Outing leader is required'); return; }
    if (!form.adultLeaderId) { setModalError('Adult leader is required'); return; }

    const payload = {
      name: form.name.trim(),
      eventTypeId: parseInt(form.eventTypeId, 10),
      startDate: form.startDate,
      endDate: isOvernight ? (form.endDate || null) : null,
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
    if (deleteConfirmText !== deletingEvent.name) return;
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

  const newOutingBtn = !pageLoading && (
    <button
      onClick={openCreate}
      className="inline-flex items-center gap-1.5 rounded-lg bg-scout-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-scout-blue/90"
    >
      <Plus className="h-4 w-4" strokeWidth={2} />
      New Outing
    </button>
  );

  useDesktopHeader({
    title: 'Outings',
    subtitle: 'Plan & manage trips',
    headerRight: newOutingBtn,
  });

  const loadingOrError = (
    <>
      {pageLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16" role="status" aria-live="polite">
          <Loader2 className="h-9 w-9 animate-spin text-scout-blue/50" aria-hidden />
          <p className="text-sm text-gray-500">Loading outings…</p>
        </div>
      )}
      {pageError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">{pageError}</div>
      )}
      {!pageLoading && !pageError && events.length === 0 && (
        <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-gray-200 bg-white/80 px-6 py-10 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-900">No outings yet</p>
          <p className="mt-2 text-sm text-gray-600">
            Add campouts, hikes, and meetings so scouts and adults can plan gear and dates in one place.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-scout-blue px-5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-scout-blue/90 touch-target"
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Create your first outing
          </button>
        </div>
      )}
    </>
  );

  const outingListToolbar =
    !pageLoading &&
    !pageError &&
    events.length > 0 && (
      <div className="mb-4 w-full">
        <SegmentedControl tabs={OUTING_LIST_TABS} value={outingListFilter} onChange={setOutingListFilter} />
      </div>
    );

  const filterEmptyMessage =
    !pageLoading &&
    !pageError &&
    events.length > 0 &&
    filteredSortedEvents.length === 0 && (
      <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-8 text-center shadow-sm">
        <p className="text-sm text-gray-600">
          {outingListFilter === 'upcoming'
            ? 'No outings in this window. Try Past for earlier trips, or create a new outing.'
            : 'No past outings to show yet. Switch to Upcoming for current and future trips.'}
        </p>
      </div>
    );

  const formModal = showModal && (
    <div
      className="modal-dialog-overlay-root select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outing-form-modal-title"
    >
      <div
        role="presentation"
        aria-hidden
        className={`modal-dialog-backdrop-surface ${formModalClosing ? 'modal-dialog-backdrop-exit' : 'modal-dialog-backdrop-enter'}`}
        onClick={requestCloseFormModal}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div
          className={`pointer-events-auto relative z-[101] flex max-h-[min(88dvh,42rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${formModalClosing ? 'modal-dialog-panel-exit' : 'modal-dialog-panel-enter'}`}
          onAnimationEnd={handleFormModalPanelAnimationEnd}
        >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 id="outing-form-modal-title" className="text-lg font-bold text-gray-900">
            {editingEvent ? 'Edit Outing' : 'New Outing'}
          </h2>
          <button
            type="button"
            onClick={requestCloseFormModal}
            className="touch-target rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
            <input type="text" value={form.name} onChange={e => handleFormChange('name', e.target.value)} autoFocus className="form-input w-full" placeholder="e.g. Spring Campout 2026" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Type *</label>
            <select value={form.eventTypeId} onChange={e => handleFormChange('eventTypeId', parseInt(e.target.value, 10))} className="form-input w-full">
              {eventTypes.map(t => <option key={t.id} value={t.id}>{t.type}</option>)}
            </select>
          </div>
          {isOvernight ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="outing-start-date" className="block text-sm font-semibold text-gray-700 mb-1">
                  Start date *
                </label>
                <OutingDatePicker
                  id="outing-start-date"
                  value={form.startDate}
                  onChange={(v) => handleFormChange('startDate', v)}
                  disabled={modalLoading}
                />
              </div>
              <div>
                <label htmlFor="outing-end-date" className="block text-sm font-semibold text-gray-700 mb-1">
                  End date *
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
          ) : (
            <div>
              <label htmlFor="outing-single-date" className="block text-sm font-semibold text-gray-700 mb-1">
                Date *
              </label>
              <OutingDatePicker
                id="outing-single-date"
                value={form.startDate}
                onChange={(v) => handleFormChange('startDate', v)}
                disabled={modalLoading}
              />
            </div>
          )}
          <div>
            <label htmlFor="outing-leader-outings" className="block text-sm font-semibold text-gray-700 mb-1">
              Outing leader *
            </label>
            <RosterSearchField
              fieldId="outing-leader-outings"
              users={scouts}
              value={form.eventSplId}
              onChange={(id) => handleFormChange('eventSplId', id)}
              searchText={outingLeaderSearch}
              onSearchTextChange={setOutingLeaderSearch}
              disabled={modalLoading}
            />
          </div>
          <div>
            <label htmlFor="adult-leader-outings" className="block text-sm font-semibold text-gray-700 mb-1">Adult Leader *</label>
            <RosterSearchField
              fieldId="adult-leader-outings"
              users={adults}
              value={form.adultLeaderId}
              onChange={(id) => handleFormChange('adultLeaderId', id)}
              searchText={adultLeaderSearch}
              onSearchTextChange={setAdultLeaderSearch}
              disabled={modalLoading}
            />
          </div>
          {modalError && <p className="text-sm text-red-600">{modalError}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={requestCloseFormModal} className="flex-1 h-11 rounded-md border border-gray-300 text-sm font-medium text-gray-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading || !isOutingFormValid}
              className="flex-1 h-11 rounded-md border text-sm font-medium transition-colors disabled:cursor-not-allowed bg-scout-blue/12 border-scout-blue/20 text-scout-blue enabled:hover:bg-scout-blue/18 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-100"
            >
              {modalLoading ? 'Saving…' : (editingEvent ? 'Save Changes' : 'Create Outing')}
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
      aria-labelledby="outing-delete-modal-title"
    >
      <div
        role="presentation"
        aria-hidden
        className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
        onClick={closeDeleteModal}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div className="modal-dialog-panel-enter pointer-events-auto relative z-[101] w-full max-w-md max-h-[min(90dvh,28rem)] overflow-y-auto rounded-2xl bg-white px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-10 shadow-2xl">
        <h2 id="outing-delete-modal-title" className="text-lg font-bold text-gray-900 mb-1">Delete Outing?</h2>
        <p className="text-sm text-gray-600 mb-3">
          This will permanently delete <span className="font-semibold">{deletingEvent.name}</span> and cannot be undone.
          Any gear still checked out to this outing will be returned to inventory.
          Transaction history will be preserved but will lose the outing link.
        </p>
        <p className="text-sm font-semibold text-gray-700 mb-1">Type the outing name to confirm:</p>
        <p className="text-xs text-gray-400 font-mono mb-2">{deletingEvent.name}</p>
        <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} autoFocus placeholder="Type outing name…" className="form-input w-full mb-4" />
        {deleteError && <p className="text-sm text-red-600 mb-3">{deleteError}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={closeDeleteModal} className="flex-1 h-11 rounded-md border border-gray-300 text-sm font-medium text-gray-700">
            Cancel
          </button>
          <button type="button" onClick={handleDelete} disabled={deleteLoading || deleteConfirmText !== deletingEvent.name} className="flex-1 h-11 rounded-md bg-red-500 text-white text-sm font-medium disabled:opacity-30">
            {deleteLoading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );

  const outingsList =
    !pageLoading &&
    !pageError &&
    events.length > 0 &&
    filteredSortedEvents.length > 0 && (
      <ul className="grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2 xl:grid-cols-3 lg:items-stretch">
        {filteredSortedEvents.map((ev) => (
          <li key={ev.id} className="flex min-h-0 h-full">
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
    );

  if (isDesktop) {
    return (
      <>
        {loadingOrError}
        {outingListToolbar}
        {filterEmptyMessage}
        {outingsList}
        {formModal ? createPortal(formModal, document.body) : null}
        {deleteModal ? createPortal(deleteModal, document.body) : null}
      </>
    );
  }

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <div className="header">
        <Link to="/home" className="back-button no-underline">←</Link>
        <h1>Outings</h1>
        <div className="flex shrink-0 items-center gap-2">
          <HeaderProfileMenu />
        </div>
      </div>

      <AnimateMain className="flex flex-1 flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 pb-24">
            {loadingOrError}
            {outingListToolbar}
            {filterEmptyMessage}
            {outingsList}
          </div>
        </div>
        {!pageLoading && (
          <div className="fixed bottom-6 right-5 z-30">
            <button onClick={openCreate} className="h-12 px-5 rounded-full bg-scout-blue text-white text-sm font-semibold shadow-lg">
              + New Outing
            </button>
          </div>
        )}
      </AnimateMain>

      {formModal ? createPortal(formModal, document.body) : null}
      {deleteModal ? createPortal(deleteModal, document.body) : null}
    </div>
  );
};

export default OutingsPage;
