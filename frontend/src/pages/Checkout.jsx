import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useInventory } from '../hooks/useInventory';

const Checkout = () => {
  const { items, clearCart, getTotalItems } = useCart();
  const { postData, getData, loading } = useInventory();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    scoutName: '',
    qmName: '',
    outingName: '',
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }),
    notes: ''
  });
  const [submitError, setSubmitError] = useState(null);
  const [outingMode, setOutingMode] = useState('new'); // 'new' or 'existing'
  const [outings, setOutings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOuting, setSelectedOuting] = useState(null);
  const [outingsLoading, setOutingsLoading] = useState(false);


  // Fetch outings when mode changes to 'existing'
  useEffect(() => {
    const fetchOutings = async () => {
      if (outingMode === 'existing') {
        try {
          setOutingsLoading(true);
          const data = await getData('/inventory/outings');
          setOutings(data);
        } catch (error) {
          console.error('Error fetching outings:', error);
          setSubmitError('Failed to load existing outings');
        } finally {
          setOutingsLoading(false);
        }
      }
    };

    fetchOutings();
  }, [outingMode, getData]);

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
        const itemCount = getTotalItems();
        clearCart();
        navigate(`/success?action=checkout&count=${itemCount}`);
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

  const handleOutingSelect = async (outingName) => {
    try {
      const details = await getData(`/inventory/outing-details/${encodeURIComponent(outingName)}`);
      setSelectedOuting(outingName);
      setFormData({
        ...formData,
        outingName: details.outingName,
        scoutName: details.scoutName,
        qmName: details.qmName,
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }), // Today's date
        notes: '' // Empty notes for new checkout
      });
    } catch (error) {
      console.error('Error fetching outing details:', error);
      setSubmitError('Failed to load outing details');
    }
  };

  const filteredOutings = outings.filter(outing =>
    outing.outingName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No items in cart</h2>
          <Link
            to="/categories"
            className="inline-block bg-scout-blue text-white px-6 py-3 rounded-lg hover:bg-scout-blue transition-colors touch-target no-underline"
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
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1 className="text-center text-truncate">Checkout Information</h1>
        <Link
          to="/cart"
          className="cart-badge no-underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cart-icon">
            <circle cx="8" cy="21" r="1"></circle>
            <circle cx="19" cy="21" r="1"></circle>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
          </svg>
          <span className="cart-count">{getTotalItems()}</span>
        </Link>
      </div>

      {/* Toggle Control */}
      <div className="bg-white px-5 py-3 border-b border-gray-200">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setOutingMode('new')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all touch-target ${
              outingMode === 'new'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            New Outing
          </button>
          <button
            onClick={() => setOutingMode('existing')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all touch-target ${
              outingMode === 'existing'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Existing Outing
          </button>
        </div>
      </div>

      <div className="px-5 py-6 pb-20">
        {outingMode === 'new' ? (
          // New Outing Form
          <form onSubmit={handleSubmit} className="space-y-6">
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
          </form>
        ) : (
          // Existing Outing Selection
          <div className="space-y-6">
            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search outings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Loading State */}
            {outingsLoading && (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading outings...</p>
              </div>
            )}

            {/* Outings List */}
            {!outingsLoading && (
              <div className="space-y-3">
                {filteredOutings.map((outing) => (
                  <div
                    key={outing.outingName}
                    onClick={() => handleOutingSelect(outing.outingName)}
                    className={`card cursor-pointer transition-all duration-200 ${
                      selectedOuting === outing.outingName ? 'card-selected' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {outing.outingName}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            📦 {outing.itemCount} item{outing.itemCount !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center">
                            📅 {new Date(outing.checkedOutDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!outingsLoading && filteredOutings.length === 0 && outings.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No outings found matching your search</p>
              </div>
            )}

            {!outingsLoading && outings.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No items are currently checked out</p>
              </div>
            )}

            {/* Selected Outing Form */}
            {selectedOuting && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Outing Details</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="selectedOutingName" className="block text-sm font-semibold text-gray-700 mb-2">
                      Outing Name *
                    </label>
                    <input
                      type="text"
                      id="selectedOutingName"
                      name="outingName"
                      value={formData.outingName}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="selectedScoutName" className="block text-sm font-semibold text-gray-700 mb-2">
                      Checked out to (Outing Leader Name) *
                    </label>
                    <input
                      type="text"
                      id="selectedScoutName"
                      name="scoutName"
                      value={formData.scoutName}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="selectedQmName" className="block text-sm font-semibold text-gray-700 mb-2">
                      Checked out by (QM name) *
                    </label>
                    <input
                      type="text"
                      id="selectedQmName"
                      name="qmName"
                      value={formData.qmName}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="selectedDate" className="block text-sm font-semibold text-gray-700 mb-2">
                      Checkout Date *
                    </label>
                    <input
                      type="date"
                      id="selectedDate"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="selectedNotes" className="block text-sm font-semibold text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="selectedNotes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      className="form-input"
                      placeholder="Any special notes or instructions..."
                    />
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{submitError}</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      {(outingMode === 'new' || (outingMode === 'existing' && selectedOuting)) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50" style={{width: '100vw'}}>
          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-full h-12 text-base font-medium px-6 has-[>svg]:px-4 bg-scout-blue text-white shadow-xs hover:bg-scout-blue"
          >
            {loading ? 'Processing...' : 'Complete Checkout'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Checkout;
