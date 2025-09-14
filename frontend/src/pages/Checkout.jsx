import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useInventory } from '../hooks/useInventory';
import { ArrowLeft, User, Calendar, FileText } from 'lucide-react';

const Checkout = () => {
  const { items, clearCart, getTotalItems } = useCart();
  const { postData, loading } = useInventory();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    scoutName: '',
    outingName: '',
    date: new Date().toISOString().split('T')[0],
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
        processedBy: 'System User', // TODO: Get from auth context
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No items in cart</h2>
          <Link
            to="/categories"
            className="inline-block bg-scout-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors touch-target"
          >
            Browse Categories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/cart"
              className="flex items-center space-x-2 text-gray-600 hover:text-scout-blue touch-target"
            >
              <ArrowLeft className="w-6 h-6" />
              <span className="font-medium">Back</span>
            </Link>
            
            <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
            
            <div className="w-6"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Items Summary */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Items to Checkout ({getTotalItems()})
            </h2>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.itemId} className="flex justify-between text-sm">
                  <span>{item.itemId} × {item.quantity}</span>
                  <span className="text-gray-600">{item.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scout Information */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Scout Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="scoutName" className="block text-sm font-medium text-gray-700 mb-1">
                  Scout Name *
                </label>
                <input
                  type="text"
                  id="scoutName"
                  name="scoutName"
                  value={formData.scoutName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent touch-target"
                  placeholder="Enter scout's name"
                />
              </div>

              <div>
                <label htmlFor="outingName" className="block text-sm font-medium text-gray-700 mb-1">
                  Outing Name *
                </label>
                <input
                  type="text"
                  id="outingName"
                  name="outingName"
                  value={formData.outingName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent touch-target"
                  placeholder="e.g., Fall Camping Trip"
                />
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Checkout Date *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent touch-target"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent touch-target"
                  placeholder="Additional notes or special instructions..."
                />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{submitError}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-scout-green text-white py-4 rounded-lg hover:bg-green-700 transition-colors touch-target font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Complete Checkout'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
