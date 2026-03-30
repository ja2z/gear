import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useReservations } from '../hooks/useInventory';

const ReservationInfo = () => {
  const navigate = useNavigate();
  const { items, clearCart, getTotalItems, reservationMeta } = useCart();
  const { postReservation, loading } = useReservations();

  const isEditing = reservationMeta?.isEditing === true;

  const [formData, setFormData] = useState({
    outingName: reservationMeta?.outingName || '',
    reservedBy: reservationMeta?.reservedBy || '',
    reservedEmail: reservationMeta?.reservedEmail || '',
  });
  const [emailError, setEmailError] = useState('');
  const [submitError, setSubmitError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'reservedEmail') setEmailError('');
  };

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
        outingName: formData.outingName,
        reservedBy: formData.reservedBy,
        reservedEmail: formData.reservedEmail,
      });

      const count = result.successful?.length || getTotalItems();
      clearCart();
      navigate(`/reservation-success?count=${count}&outing=${encodeURIComponent(result.outingName || formData.outingName)}`);
    } catch (err) {
      setSubmitError(err.message || 'Failed to create reservation. Please try again.');
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No items in cart</h2>
          <Link
            to="/categories?mode=reserve"
            className="inline-block bg-scout-orange text-white px-6 py-3 rounded-lg touch-target no-underline"
          >
            Browse Categories
          </Link>
        </div>
      </div>
    );
  }

  const formReady = formData.outingName.trim() && formData.reservedBy.trim() && formData.reservedEmail.trim();

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {/* Header */}
      <div className="header header-reserve">
        <Link to="/cart?mode=reserve" className="back-button no-underline">←</Link>
        <h1 className="text-center text-truncate">Reservation Information</h1>
        <div className="w-10 h-10" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-6 pb-24">
          {/* Item count summary */}
          <div className="mb-5 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
            <p className="text-sm text-orange-800">
              {isEditing ? 'Updating' : 'Reserving'} <span className="font-bold">{getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}</span>
            </p>
          </div>

          <form id="reservation-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="outingName" className="block text-sm font-semibold text-gray-700 mb-2">
                Outing Name *
              </label>
              <input
                type="text"
                id="outingName"
                name="outingName"
                value={formData.outingName}
                onChange={handleChange}
                required
                autoComplete="off"
                disabled={isEditing}
                className={`form-input w-full ${isEditing ? 'bg-gray-50 text-gray-500 cursor-not-allowed opacity-60' : ''}`}
                placeholder="e.g. Summer Campout 2025"
              />
              {isEditing && (
                <p className="mt-1 text-xs text-gray-500">Outing name cannot be changed when editing</p>
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
                className="form-input w-full"
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
                className={`form-input w-full ${emailError ? 'border-red-400' : ''}`}
                placeholder="e.g. leader@t222.org"
                autoComplete="email"
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-600">{emailError}</p>
              )}
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
          className="w-full h-12 text-base font-medium rounded-md bg-scout-orange text-white disabled:opacity-50"
        >
          {loading ? 'Processing...' : isEditing ? 'Update Reservation' : 'Complete Reservation'}
        </button>
      </div>
    </div>
  );
};

export default ReservationInfo;
