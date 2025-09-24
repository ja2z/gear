import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useInventory } from '../hooks/useInventory';

const Checkout = () => {
  const { items, clearCart, getTotalItems } = useCart();
  const { postData, loading } = useInventory();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    scoutName: '',
    qmName: '',
    outingName: '',
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }),
    notes: ''
  });
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    try {
      const itemIds = items.map(item => item.itemId);
      const checkoutData = {
        itemIds,
        scoutName: formData.scoutName,
        outingName: formData.outingName,
        processedBy: formData.qmName,
        notes: formData.notes
      };

      const result = await postData('/checkout', checkoutData);
      
      if (result.success) {
        clearCart();
        navigate('/success');
      } else {
        setSubmitError(result.message || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setSubmitError('Failed to process checkout. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No items in cart</h2>
          <Link
            to="/categories"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors touch-target"
          >
            Browse Categories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link
          to="/cart"
          className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white text-lg"
        >
          ←
        </Link>
        <h1>Checkout Information</h1>
      </div>

      <div className="px-5 py-6 pb-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Checkout Information */}
          <div className="space-y-5">
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
                className="form-input"
                placeholder="e.g. Spring Campout 2025"
              />
            </div>

            <div>
              <label htmlFor="qmName" className="block text-sm font-semibold text-gray-700 mb-2">
                Checked out by (QM name) *
              </label>
              <input
                type="text"
                id="qmName"
                name="qmName"
                value={formData.qmName}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Enter quartermaster name"
              />
            </div>

            <div>
              <label htmlFor="scoutName" className="block text-sm font-semibold text-gray-700 mb-2">
                Checked out to (Outing Leader Name) *
              </label>
              <input
                type="text"
                id="scoutName"
                name="scoutName"
                value={formData.scoutName}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Enter outing leader name"
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-2">
                Checkout Date *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="form-input"
                placeholder="Any special notes or instructions..."
              />
            </div>
          </div>

          {/* Error Display */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{submitError}</p>
            </div>
          )}
        </form>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="flex gap-4">
          <Link
            to="/cart"
            className="nav-btn btn-secondary text-center"
          >
            Back
          </Link>
          <button
            type="submit"
            form="checkout-form"
            disabled={loading}
            onClick={handleSubmit}
            className="nav-btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Complete Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
