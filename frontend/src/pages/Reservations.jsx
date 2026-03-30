import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useReservations } from '../hooks/useInventory';

const Reservations = () => {
  const navigate = useNavigate();
  const { clearCart, setReservationMeta, addMultipleItems } = useCart();
  const { fetchReservations, fetchReservationItems } = useReservations();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // { outingName, type: 'edit'|'checkout' }
  const [deleteTarget, setDeleteTarget] = useState(null); // reservation pending delete confirmation
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchReservations()
      .then(setReservations)
      .catch(() => setError('Could not load reservations. Please try again.'))
      .finally(() => setLoading(false));
  }, [fetchReservations]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const apiBase = import.meta.env.PROD
        ? (import.meta.env.VITE_API_URL || 'https://gear-backend.onrender.com/api')
        : '/api';
      const res = await fetch(`${apiBase}/reservations/${encodeURIComponent(deleteTarget.outingName)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setReservations(prev => prev.filter(r => r.outingName !== deleteTarget.outingName));
      setDeleteTarget(null);
    } catch (err) {
      setError('Could not delete reservation. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Fix: _dest is stored on meta but shouldn't be passed to setReservationMeta
  // Rewrite loadAndNavigate to be cleaner
  const handleCheckOutClean = async (res) => {
    setActionLoading({ outingName: res.outingName, type: 'checkout' });
    try {
      const reservation = await fetchReservationItems(res.outingName);
      clearCart();
      addMultipleItems(reservation.items);
      setReservationMeta({
        fromReservation: true,
        outingName: reservation.outingName,
        scoutName: reservation.reservedBy,
        originalItems: reservation.items.map(i => ({ itemId: i.itemId, description: i.description, itemClass: i.itemClass, itemNum: i.itemNum })),
      });
      navigate('/categories');
    } catch (err) {
      setError('Could not load reservation items. Please try again.');
      setActionLoading(null);
    }
  };

  const handleEditClean = async (res) => {
    setActionLoading({ outingName: res.outingName, type: 'edit' });
    try {
      const reservation = await fetchReservationItems(res.outingName);
      clearCart();
      addMultipleItems(reservation.items);
      setReservationMeta({
        isEditing: true,
        outingName: reservation.outingName,
        scoutName: reservation.reservedBy,
        reservedBy: reservation.reservedBy,
        reservedEmail: reservation.reservedEmail,
        originalItems: reservation.items.map(i => ({ itemId: i.itemId, description: i.description, itemClass: i.itemClass, itemNum: i.itemNum })),
      });
      navigate('/categories?mode=reserve');
    } catch (err) {
      setError('Could not load reservation items. Please try again.');
      setActionLoading(null);
    }
  };

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link to="/" className="back-button no-underline">←</Link>
        <h1>Reservations</h1>
        <div className="w-10 h-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-5 space-y-3">
          {/* Create button */}
          <button
            onClick={() => { clearCart(); navigate('/categories?mode=reserve'); }}
            className="w-full h-12 text-base font-medium rounded-md bg-scout-orange text-white"
          >
            + Create Reservation
          </button>

          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {error && (
            <p className="text-center text-sm text-scout-red py-4">{error}</p>
          )}

          {!loading && !error && reservations.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-10">No active reservations.</p>
          )}

          {reservations.map(res => {
            const isEditLoading = actionLoading?.outingName === res.outingName && actionLoading?.type === 'edit';
            const isCheckoutLoading = actionLoading?.outingName === res.outingName && actionLoading?.type === 'checkout';
            const anyLoading = !!actionLoading;
            return (
              <div key={res.outingName} className="card">
                <div className="mb-3">
                  <div className="font-semibold text-gray-900">{res.outingName}</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {res.reservedBy} · {res.itemCount} {res.itemCount === 1 ? 'item' : 'items'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Reserved {new Date(res.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClean(res)}
                    disabled={anyLoading}
                    className="flex-1 h-9 text-sm font-medium rounded-md bg-scout-orange text-white disabled:opacity-50"
                  >
                    {isEditLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Edit'}
                  </button>
                  <button
                    onClick={() => handleCheckOutClean(res)}
                    disabled={anyLoading}
                    className="flex-1 h-9 text-sm font-medium rounded-md bg-scout-blue text-white disabled:opacity-50"
                  >
                    {isCheckoutLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Check Out'}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(res)}
                    disabled={!!actionLoading}
                    className="flex-1 h-9 text-sm font-medium rounded-md border border-scout-red text-scout-red disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete confirmation — bottom sheet */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-t-2xl px-5 pt-5 pb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Delete Reservation?</h2>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">{deleteTarget.outingName}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {deleteTarget.itemCount === 1 ? 'The 1 reserved item' : `All ${deleteTarget.itemCount} reserved items`} will be returned to available inventory.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="flex-1 h-12 rounded-md border border-gray-300 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="flex-1 h-12 rounded-md bg-scout-red text-white text-sm font-medium disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reservations;
