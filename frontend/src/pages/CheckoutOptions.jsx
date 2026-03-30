import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, BookMarked, Loader2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useReservations } from '../hooks/useInventory';

const CheckoutOptions = () => {
  const navigate = useNavigate();
  const { addMultipleItems, clearCart, setReservationMeta } = useCart();
  const { fetchReservations, fetchReservationItems } = useReservations();

  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservations, setReservations] = useState(null); // null = not fetched yet
  const [showModal, setShowModal] = useState(false);
  const [selectedOuting, setSelectedOuting] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleReservationsClick = async () => {
    setReservationsLoading(true);
    setError(null);
    try {
      const data = await fetchReservations();
      setReservations(data);
      if (data.length > 0) {
        setShowModal(true);
      }
    } catch (err) {
      setError('Could not load reservations. Please try again.');
    } finally {
      setReservationsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedOuting) return;
    setConfirmLoading(true);
    setError(null);
    try {
      const reservation = await fetchReservationItems(selectedOuting.outingName);
      clearCart();
      addMultipleItems(reservation.items);
      setReservationMeta({
        fromReservation: true,
        outingName: reservation.outingName,
        scoutName: reservation.reservedBy,
      });
      navigate('/categories');
    } catch (err) {
      setError('Could not load reservation items. Please try again.');
      setConfirmLoading(false);
    }
  };

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link to="/" className="back-button no-underline">←</Link>
        <h1>Check Out</h1>
        <div className="w-10 h-10" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="shrink-0 bg-white px-5 pt-2 pb-7 space-y-3">
          {/* Check Out button */}
          <div className="flex gap-3">
            <button
              onClick={() => { clearCart(); navigate('/categories'); }}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 touch-target bg-scout-blue text-white shadow-sm"
            >
              <LogOut className="h-6 w-6" />
              <span className="text-base font-bold">Check Out</span>
            </button>

            <button
              onClick={handleReservationsClick}
              disabled={reservationsLoading}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 touch-target bg-scout-orange text-white shadow-sm disabled:opacity-50"
            >
              {reservationsLoading
                ? <Loader2 className="h-6 w-6 animate-spin" />
                : <BookMarked className="h-6 w-6" />}
              <span className="text-base font-bold">Reservations</span>
            </button>
          </div>

          {/* No reservations message */}
          {reservations !== null && reservations.length === 0 && (
            <p className="text-center text-sm text-gray-500 pt-1">No active reservations found.</p>
          )}

          {error && (
            <p className="text-center text-sm text-scout-red pt-1">{error}</p>
          )}
        </div>
      </div>

      {/* Reservation selection modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-t-2xl px-5 pt-5 pb-8 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Select Reservation</h2>
              <button
                onClick={() => { setShowModal(false); setSelectedOuting(null); setError(null); }}
                className="p-2 rounded-full text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {reservations.map(res => (
                <button
                  key={res.outingName}
                  onClick={() => setSelectedOuting(res)}
                  className={`w-full text-left card touch-target transition-all ${
                    selectedOuting?.outingName === res.outingName ? 'card-selected' : ''
                  }`}
                >
                  <div className="font-semibold text-gray-900">{res.outingName}</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {res.reservedBy} · {res.itemCount} {res.itemCount === 1 ? 'item' : 'items'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Reserved {new Date(res.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </button>
              ))}
            </div>

            {error && <p className="text-sm text-scout-red mb-2">{error}</p>}

            <button
              onClick={handleConfirm}
              disabled={!selectedOuting || confirmLoading}
              className="w-full h-12 text-base font-medium rounded-md bg-scout-blue text-white disabled:opacity-50"
            >
              {confirmLoading ? 'Loading...' : 'Confirm Selection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutOptions;
