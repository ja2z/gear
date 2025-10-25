import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';

const CheckinForm = () => {
  const { postData, loading } = useInventory();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get selected items and outing from location state
  const { selectedItems, selectedOuting } = location.state || {};
  
  const [formData, setFormData] = useState({
    qmName: ''
  });
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.qmName.trim()) {
      setSubmitError('Please enter your name');
      return;
    }

    if (!selectedItems || selectedItems.length === 0) {
      setSubmitError('No items selected for checkin');
      return;
    }

    try {
      const itemIds = selectedItems.map(item => item.itemId);
      const conditions = selectedItems.map(item => item.condition);
      
      const checkinData = {
        itemIds,
        conditions,
        processedBy: formData.qmName.trim(),
        notes: ''
      };

      const result = await postData('/checkin', checkinData);
      
      if (result.success) {
        navigate(`/success?action=checkin&count=${selectedItems.length}`);
      } else {
        setSubmitError(result.message || 'Checkin failed');
      }
    } catch (error) {
      console.error('Checkin error:', error);
      setSubmitError('Failed to process checkin. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Redirect if no items selected
  if (!selectedItems || selectedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No items selected</h2>
          <Link
            to={selectedOuting ? `/checkin/items?outing=${encodeURIComponent(selectedOuting)}` : "/checkin"}
            className="inline-block bg-scout-blue text-white px-6 py-3 rounded-lg hover:bg-scout-blue transition-colors touch-target no-underline"
          >
            Select Items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link
          to={selectedOuting ? `/checkin/items?outing=${encodeURIComponent(selectedOuting)}` : "/checkin"}
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1 className="text-center text-truncate">Check In Information</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-6 pb-20">
          {/* Selected Items Summary */}
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 text-center">
              Checking In {selectedItems.length} Item{selectedItems.length > 1 ? 's' : ''}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* QM Name Input */}
            <div>
              <label htmlFor="qmName" className="block text-sm font-semibold text-gray-700 mb-2">
                Your Name (QM) *
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

            {/* Error Display */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{submitError}</p>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 p-4">
        <button
          type="submit"
          form="checkin-form"
          disabled={loading || !formData.qmName.trim()}
          onClick={handleSubmit}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-full h-12 text-base font-medium px-6 has-[>svg]:px-4 bg-scout-blue text-white shadow-xs hover:bg-scout-blue"
        >
          {loading ? 'Processing...' : `Complete Check In (${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  );
};

export default CheckinForm;
