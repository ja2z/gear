import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useReservations, useInventory } from '../hooks/useInventory';
import { useAuth } from '../context/AuthContext';
import { formatTroopEventDate } from '../utils/outingFormat';

/** Modal: pick calendar event, then edit an existing reservation or start a new gear hold. */
export default function ReservationPickerModal({ open, onDismiss }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { beginReserveCategoriesDraft, setCartReservationSession } = useCart();
  const { fetchReservations, fetchReservationItems } = useReservations();
  const { getData, deleteData } = useInventory();

  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [draftError, setDraftError] = useState(null);
  /** User tapped “create reservation” for the current outing — stays on this modal; enables Edit reserved gear */
  const [newReservationReady, setNewReservationReady] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const userFullName = user ? `${user.first_name} ${user.last_name}` : '';

  useEffect(() => {
    if (!open) return;
    setSelectedEventId('');
    setListError(null);
    setList([]);
    setEvents([]);
    setDraftError(null);
    setNewReservationReady(false);
    setDeleteConfirm(null);
    setDeleteSubmitting(false);

    let cancelled = false;
    (async () => {
      setListLoading(true);
      setEventsLoading(true);
      try {
        const [resData, eventsData] = await Promise.all([
          fetchReservations(),
          getData('/events'),
        ]);
        if (cancelled) return;
        setList(Array.isArray(resData) ? resData : []);
        setEvents(eventsData || []);
      } catch {
        if (!cancelled) {
          setListError('Could not load events or reservations. Try again.');
          setList([]);
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
          setEventsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, fetchReservations, getData, user?.email, userFullName]);

  const reservationForSelectedOuting = useMemo(() => {
    if (!selectedEventId || !list.length) return null;
    return list.find((r) => String(r.eventId) === String(selectedEventId)) ?? null;
  }, [selectedEventId, list]);

  const handleOutingChange = (e) => {
    setDraftError(null);
    setNewReservationReady(false);
    setSelectedEventId(e.target.value);
  };

  const handleStartCreateFromMain = () => {
    setDraftError(null);
    if (!selectedEventId) {
      setDraftError('Select an event first.');
      return;
    }
    if (reservationForSelectedOuting) return;
    setNewReservationReady(true);
  };

  const proceedToReserveCategories = () => {
    if (!selectedEventId) return;
    const ev = events.find((x) => String(x.id) === String(selectedEventId));
    const outingName = ev?.name || `Event ${selectedEventId}`;
    beginReserveCategoriesDraft({
      eventId: selectedEventId,
      outingName,
      eventType: ev?.eventType ?? '',
      reservedBy: userFullName.trim() || '',
      reservedEmail: (user?.email || '').trim(),
      reservationDraft: true,
      scoutName: userFullName.trim() || '',
    });
    onDismiss();
    navigate('/categories?mode=reserve');
  };

  const handleContinueExisting = async () => {
    if (!selectedEventId || !reservationForSelectedOuting) return;
    setConfirmLoading(true);
    setListError(null);
    try {
      const reservation = await fetchReservationItems(selectedEventId);
      const eventRow = events.find((e) => String(e.id) === String(selectedEventId));
      setCartReservationSession({
        items: reservation.items,
        meta: {
          isEditing: true,
          eventId: reservation.eventId,
          outingName: reservation.outingName,
          eventType: eventRow?.eventType ?? '',
          scoutName: reservation.reservedBy,
          reservedBy: reservation.reservedBy,
          reservedEmail: reservation.reservedEmail,
          originalItems: reservation.items.map((i) => ({
            itemId: i.itemId,
            description: i.description,
            itemClass: i.itemClass,
            itemNum: i.itemNum,
          })),
        },
      });
      onDismiss();
      navigate('/categories?mode=reserve');
    } catch {
      setListError('Could not load that reservation. Try again.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleFooterPrimary = async () => {
    if (!selectedEventId) return;
    if (reservationForSelectedOuting) {
      await handleContinueExisting();
      return;
    }
    if (newReservationReady) {
      proceedToReserveCategories();
    }
  };

  const handleDeleteReservationConfirm = async () => {
    if (!deleteConfirm) return;
    setDeleteSubmitting(true);
    setListError(null);
    try {
      await deleteData(`/reservations/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      setNewReservationReady(false);
      onDismiss();
      navigate('/gear');
    } catch (err) {
      setListError(err.message || 'Could not remove this reservation.');
      setDeleteConfirm(null);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (!open) return null;

  const isRemoveStep = Boolean(deleteConfirm);

  const canEditExisting =
    Boolean(selectedEventId) &&
    (Boolean(reservationForSelectedOuting) ||
      (newReservationReady && !reservationForSelectedOuting));

  const closeOrBack = () => {
    if (deleteSubmitting) return;
    if (deleteConfirm) {
      setDeleteConfirm(null);
      setListError(null);
      return;
    }
    onDismiss();
  };

  return (
    <div
      className="modal-dialog-overlay-root select-none z-[120]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={isRemoveStep ? 'reservation-picker-remove-title' : 'reservation-picker-title'}
    >
      <div
        role="presentation"
        aria-hidden
        className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
        onClick={closeOrBack}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div
          className="modal-dialog-panel-enter pointer-events-auto relative z-[121] flex max-h-[min(90dvh,46rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pt-6 pb-6">
            {isRemoveStep && deleteConfirm && (
              <>
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                    <button
                      type="button"
                      onClick={closeOrBack}
                      disabled={deleteSubmitting}
                      className="touch-target shrink-0 rounded-full p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                      aria-label="Back to event list"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h2 id="reservation-picker-remove-title" className="text-lg font-bold text-gray-900">
                      Remove reservation?
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeOrBack}
                    disabled={deleteSubmitting}
                    className="touch-target -mr-1 -mt-1 shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-5">
                  Frees gear held for{' '}
                  <span className="font-medium text-gray-900">{deleteConfirm.name}</span>. The event stays on the
                  calendar.
                </p>
                {listError && <p className="text-center text-sm text-scout-red">{listError}</p>}
              </>
            )}

            {!isRemoveStep && (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 pr-2">
                  <h2 id="reservation-picker-title" className="text-lg font-bold text-gray-900 mb-1">
                    Choose an event
                  </h2>
                  <p className="text-sm text-gray-600 mb-5">
                    Pick the event, then reserve gear or edit an existing hold.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeOrBack}
                  disabled={deleteSubmitting}
                  className="touch-target -mr-1 -mt-1 shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {!isRemoveStep && listLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-scout-blue/70" />
              </div>
            )}

            {!isRemoveStep && !listLoading && listError && (
              <p className="text-center text-sm text-scout-red">{listError}</p>
            )}

            {!isRemoveStep && !listLoading && !listError && (
              <div>
                <label
                  htmlFor="reservation-picker-event"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Event *
                </label>
                <select
                  id="reservation-picker-event"
                  value={selectedEventId}
                  onChange={handleOutingChange}
                  disabled={eventsLoading}
                  className="form-input w-full"
                >
                  <option value="">{eventsLoading ? 'Loading events…' : 'Select an event…'}</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={String(ev.id)}>
                      {ev.name}
                      {ev.startDate ? ` — ${formatTroopEventDate(ev.startDate)}` : ''}
                    </option>
                  ))}
                </select>

                {draftError && <p className="mt-2 text-center text-sm text-scout-red">{draftError}</p>}

                {selectedEventId && reservationForSelectedOuting && (
                  <div className="card mt-3 space-y-4 border-scout-blue/20 bg-scout-blue/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-base font-semibold leading-snug text-gray-900">
                        {reservationForSelectedOuting.outingName}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirm({
                            id: String(reservationForSelectedOuting.eventId),
                            name: reservationForSelectedOuting.outingName,
                          })
                        }
                        disabled={listLoading || confirmLoading}
                        className="shrink-0 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-scout-red shadow-sm transition-colors hover:bg-scout-red/5 active:bg-scout-red/10 disabled:opacity-50 touch-target"
                        aria-label="Remove reservation"
                      >
                        Remove
                      </button>
                    </div>
                    <dl className="space-y-2 border-t border-gray-200/90 pt-3 text-sm">
                      <div>
                        <dt className="text-gray-500">Reserved by</dt>
                        <dd className="mt-0.5 text-gray-900">{reservationForSelectedOuting.reservedBy}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Contact email</dt>
                        <dd className="mt-0.5 break-all text-gray-900">
                          {reservationForSelectedOuting.reservedEmail}
                        </dd>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <div>
                          <dt className="text-gray-500">Items</dt>
                          <dd className="mt-0.5 font-medium text-gray-900">
                            {reservationForSelectedOuting.itemCount}{' '}
                            {reservationForSelectedOuting.itemCount === 1 ? 'item' : 'items'}
                          </dd>
                        </div>
                        {reservationForSelectedOuting.createdAt && (
                          <div>
                            <dt className="text-gray-500">Reserved on</dt>
                            <dd className="mt-0.5 text-gray-900">
                              {new Date(reservationForSelectedOuting.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </dd>
                          </div>
                        )}
                      </div>
                    </dl>
                  </div>
                )}

                {selectedEventId && !reservationForSelectedOuting && !newReservationReady && (
                  <button
                    type="button"
                    onClick={handleStartCreateFromMain}
                    className="group mt-3 flex w-full min-h-[44px] items-center gap-3 rounded-xl border-2 border-dashed border-scout-orange/45 bg-gradient-to-b from-scout-orange/12 to-scout-orange/5 px-4 py-4 text-left shadow-sm transition-colors hover:border-scout-orange hover:bg-scout-orange/15 active:bg-scout-orange/20 touch-target"
                    aria-label="Create new reservation for this event"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">No gear reservation for this event yet</p>
                      <p className="mt-1 text-sm font-medium text-scout-orange">Tap to create a reservation</p>
                    </div>
                    <ChevronRight
                      className="h-6 w-6 shrink-0 text-scout-orange transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </button>
                )}

                {selectedEventId && !reservationForSelectedOuting && newReservationReady && (
                  <div
                    role="status"
                    className="mt-3 rounded-xl border border-scout-orange/30 bg-scout-orange/10 px-4 py-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-scout-orange">
                      Reservation created
                    </p>
                    <p className="mt-2 text-sm text-gray-800">
                      You can add gear for this event next. Tap <span className="font-semibold">Edit reserved gear</span>{' '}
                      below.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-200 px-6 py-4">
            {isRemoveStep ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (deleteSubmitting) return;
                    setDeleteConfirm(null);
                    setListError(null);
                  }}
                  disabled={deleteSubmitting}
                  className="flex-1 h-12 rounded-md border border-gray-300 text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteReservationConfirm}
                  disabled={deleteSubmitting}
                  className="flex-1 h-12 rounded-md bg-scout-red text-sm font-medium text-white disabled:opacity-50"
                >
                  {deleteSubmitting ? 'Removing…' : 'Remove reservation'}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onDismiss}
                  className="flex-1 h-12 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFooterPrimary}
                  disabled={!canEditExisting || confirmLoading || listLoading}
                  title={
                    !selectedEventId
                      ? 'Select an event'
                      : !reservationForSelectedOuting && !newReservationReady
                        ? 'Create a reservation first — tap the card above'
                        : undefined
                  }
                  className="flex-1 h-12 rounded-md bg-scout-orange text-base font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:opacity-90"
                >
                  {confirmLoading ? 'Loading…' : 'Edit reserved gear'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
