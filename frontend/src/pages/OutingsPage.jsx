import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import { useInventory } from '../hooks/useInventory';
import { getApiBaseUrl } from '../config/apiBaseUrl';

const defaultForm = {
  name: '',
  eventTypeId: '',
  startDate: '',
  endDate: '',
  eventSplId: '',
  eventAsplId: '',
  adultLeaderId: '',
};

const TYPE_BADGES = {
  'Day Outing':       'bg-green-100 text-green-800',
  'Overnight Outing': 'bg-blue-100 text-blue-800',
  'Meeting':          'bg-gray-100 text-gray-700',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const OutingsPage = () => {
  const { getData } = useInventory();

  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  // Modal state (create & edit)
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Delete state
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

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

  const openCreate = () => {
    setEditingEvent(null);
    setForm({ ...defaultForm, eventTypeId: eventTypes[0]?.id || '' });
    setModalError(null);
    setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditingEvent(ev);
    setForm({
      name: ev.name,
      eventTypeId: ev.eventTypeId,
      startDate: ev.startDate || '',
      endDate: ev.endDate || '',
      eventSplId: ev.eventSplId || '',
      eventAsplId: ev.eventAsplId || '',
      adultLeaderId: ev.adultLeaderId || '',
    });
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
    if (!form.startDate)    { setModalError('Start date is required'); return; }
    if (isOvernight && !form.endDate) { setModalError('End date is required for overnight outings'); return; }
    if (!form.eventSplId)   { setModalError('SPL is required'); return; }
    if (!form.adultLeaderId) { setModalError('Adult leader is required'); return; }

    const payload = {
      name: form.name.trim(),
      eventTypeId: parseInt(form.eventTypeId, 10),
      startDate: form.startDate,
      endDate: isOvernight ? (form.endDate || null) : null,
      eventSplId: form.eventSplId || null,
      eventAsplId: form.eventAsplId || null,
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
      setShowModal(false);
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

            {pageLoading && (
              <p className="text-center text-gray-400 mt-12">Loading outings…</p>
            )}

            {pageError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
                {pageError}
              </div>
            )}

            {!pageLoading && !pageError && events.length === 0 && (
              <p className="text-center text-gray-400 mt-12">No outings yet.</p>
            )}

            {!pageLoading && !pageError && events.map(ev => (
              <div key={ev.id} className="bg-white rounded-xl border border-gray-200 mb-3 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm leading-snug">{ev.name}</span>
                      {ev.eventType && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGES[ev.eventType] || 'bg-gray-100 text-gray-700'}`}>
                          {ev.eventType}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {ev.startDate && (
                        <p>
                          {formatDate(ev.startDate)}
                          {ev.endDate ? ` – ${formatDate(ev.endDate)}` : ''}
                        </p>
                      )}
                      {ev.eventSplName && <p>SPL: {ev.eventSplName}</p>}
                      {ev.eventAsplName && <p>ASPL: {ev.eventAsplName}</p>}
                      {ev.adultLeaderName && <p>Adult Leader: {ev.adultLeaderName}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(ev)}
                      className="h-8 px-3 rounded-md border border-gray-200 text-xs font-medium text-gray-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setDeletingEvent(ev); setDeleteConfirmText(''); setDeleteError(null); }}
                      className="h-8 px-3 rounded-md border border-red-200 text-xs font-medium text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New outing FAB */}
        {!pageLoading && (
          <div className="fixed bottom-6 right-5 z-30">
            <button
              onClick={openCreate}
              className="h-12 px-5 rounded-full bg-scout-blue text-white text-sm font-semibold shadow-lg"
            >
              + New Outing
            </button>
          </div>
        )}
      </AnimateMain>

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingEvent ? 'Edit Outing' : 'New Outing'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleFormChange('name', e.target.value)}
                  autoFocus
                  className="form-input w-full"
                  placeholder="e.g. Spring Campout 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Type *</label>
                <select
                  value={form.eventTypeId}
                  onChange={e => handleFormChange('eventTypeId', parseInt(e.target.value, 10))}
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
                  value={form.startDate}
                  onChange={e => handleFormChange('startDate', e.target.value)}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  End Date {isOvernight ? '*' : '(Optional)'}
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={e => handleFormChange('endDate', e.target.value)}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">SPL (Senior Patrol Leader) *</label>
                <select
                  value={form.eventSplId}
                  onChange={e => handleFormChange('eventSplId', e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">— Select SPL —</option>
                  {scouts.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ASPL (Assistant SPL)</label>
                <select
                  value={form.eventAsplId}
                  onChange={e => handleFormChange('eventAsplId', e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">— None —</option>
                  {scouts.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Adult Leader *</label>
                <select
                  value={form.adultLeaderId}
                  onChange={e => handleFormChange('adultLeaderId', e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">— Select Adult Leader —</option>
                  {adults.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              {modalError && (
                <p className="text-sm text-red-600">{modalError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-11 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 h-11 rounded-md bg-scout-blue/12 border border-scout-blue/20 text-scout-blue text-sm font-medium disabled:opacity-50"
                >
                  {modalLoading ? 'Saving…' : (editingEvent ? 'Save Changes' : 'Create Outing')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Delete Outing?</h2>
            <p className="text-sm text-gray-600 mb-3">
              This will permanently delete <span className="font-semibold">{deletingEvent.name}</span> and cannot be undone.
              Any gear still checked out to this outing will be returned to inventory.
              Transaction history will be preserved but will lose the outing link.
            </p>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Type the outing name to confirm:
            </p>
            <p className="text-xs text-gray-400 font-mono mb-2">{deletingEvent.name}</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              autoFocus
              placeholder="Type outing name…"
              className="form-input w-full mb-4"
            />
            {deleteError && (
              <p className="text-sm text-red-600 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeletingEvent(null); setDeleteConfirmText(''); setDeleteError(null); }}
                className="flex-1 h-11 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading || deleteConfirmText !== deletingEvent.name}
                className="flex-1 h-11 rounded-md bg-red-500 text-white text-sm font-medium disabled:opacity-30"
              >
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutingsPage;
