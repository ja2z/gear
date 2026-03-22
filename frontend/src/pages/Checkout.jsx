import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useInventory } from '../hooks/useInventory';

const defaultDate = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

const Checkout = () => {
  const { items, clearCart, getTotalItems } = useCart();
  const { postData, getData, loading } = useInventory();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    scoutName: '',
    qmName: '',
    outingName: '',
    date: defaultDate(),
    notes: ''
  });
  const [submitError, setSubmitError] = useState(null);
  const [outings, setOutings] = useState([]);
  const [selectedOuting, setSelectedOuting] = useState(null);
  const [outingsLoading, setOutingsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const blurCloseRef = useRef(null);

  const cancelCloseSuggestions = useCallback(() => {
    if (blurCloseRef.current) {
      clearTimeout(blurCloseRef.current);
      blurCloseRef.current = null;
    }
  }, []);

  const scheduleCloseSuggestions = useCallback(() => {
    cancelCloseSuggestions();
    blurCloseRef.current = setTimeout(() => {
      setSuggestionsOpen(false);
      blurCloseRef.current = null;
    }, 200);
  }, [cancelCloseSuggestions]);

  useEffect(() => {
    const fetchOutings = async () => {
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
    };

    fetchOutings();
  }, [getData]);

  useEffect(() => () => cancelCloseSuggestions(), [cancelCloseSuggestions]);

  const outingNameReady = formData.outingName.trim().length > 0;
  const secondaryLocked = !outingNameReady;

  const filteredOutings = outings.filter(outing =>
    outing.outingName.toLowerCase().includes(formData.outingName.toLowerCase())
  );

  const secondaryFieldClass = secondaryLocked
    ? 'form-input bg-gray-50 text-gray-500 cursor-not-allowed opacity-60'
    : 'form-input';

  const secondaryLabelClass = secondaryLocked
    ? 'block text-sm font-medium text-gray-400 mb-2'
    : 'block text-sm font-semibold text-gray-700 mb-2';

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
    const { name, value } = e.target;

    if (name === 'outingName') {
      if (!value.trim()) {
        setFormData(prev => ({
          ...prev,
          outingName: value,
          scoutName: '',
          qmName: '',
          notes: '',
          date: defaultDate()
        }));
        setSelectedOuting(null);
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOutingSelect = async (outingName) => {
    cancelCloseSuggestions();
    setSuggestionsOpen(false);
    try {
      const details = await getData(`/inventory/outing-details/${encodeURIComponent(outingName)}`);
      setSelectedOuting(outingName);
      setFormData(prev => ({
        ...prev,
        outingName: details.outingName,
        scoutName: details.scoutName,
        qmName: details.qmName,
        date: defaultDate(),
        notes: ''
      }));
    } catch (error) {
      console.error('Error fetching outing details:', error);
      setSubmitError('Failed to load outing details');
    }
  };

  const handleAddNewOuting = (e) => {
    e.preventDefault();
    cancelCloseSuggestions();
    setSuggestionsOpen(false);
    if (selectedOuting) {
      setSelectedOuting(null);
      setFormData(prev => ({
        ...prev,
        scoutName: '',
        qmName: '',
        notes: '',
        date: defaultDate()
      }));
    }
  };

  const handleOutingNameFocus = () => {
    cancelCloseSuggestions();
    setSuggestionsOpen(true);
  };

  const handleOutingNameBlur = () => {
    scheduleCloseSuggestions();
  };

  const handleOutingNameKeyDown = (e) => {
    if (e.key === 'Escape') {
      cancelCloseSuggestions();
      setSuggestionsOpen(false);
    }
  };

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
    <div className="h-screen-small flex flex-col bg-gray-100">
      <div className="header">
        <Link to="/cart" className="back-button no-underline">
          ←
        </Link>
        <h1 className="text-center text-truncate">Checkout Information</h1>
        <Link to="/cart" className="cart-badge no-underline">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="cart-icon"
          >
            <circle cx="8" cy="21" r="1"></circle>
            <circle cx="19" cy="21" r="1"></circle>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
          </svg>
          <span className="cart-count">{getTotalItems()}</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-6 pb-20">
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div className="relative z-20">
                <label htmlFor="outingName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Outing Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="outingName"
                    name="outingName"
                    value={formData.outingName}
                    onChange={handleChange}
                    onFocus={handleOutingNameFocus}
                    onBlur={handleOutingNameBlur}
                    onKeyDown={handleOutingNameKeyDown}
                    autoComplete="off"
                    aria-expanded={suggestionsOpen}
                    aria-controls="outing-suggestions"
                    aria-autocomplete="list"
                    required
                    className="form-input w-full"
                    style={formData.outingName ? { paddingRight: '2.5rem' } : {}}
                    placeholder="e.g. Spring Campout 2025"
                  />
                  {formData.outingName && (
                    <button
                      type="button"
                      aria-label="Clear outing name"
                      onMouseDown={e => {
                        e.preventDefault();
                        cancelCloseSuggestions();
                        setSuggestionsOpen(false);
                        setSelectedOuting(null);
                        setFormData(prev => ({
                          ...prev,
                          outingName: '',
                          scoutName: '',
                          qmName: '',
                          notes: '',
                          date: defaultDate()
                        }));
                      }}
                      style={{
                        position: 'absolute',
                        right: '0.625rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '1.5rem',
                        height: '1.5rem',
                        borderRadius: '50%',
                        border: 'none',
                        background: '#d1d5db',
                        color: '#6b7280',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {suggestionsOpen && (
                  <div
                    id="outing-suggestions"
                    role="listbox"
                    className="absolute left-0 right-0 mt-1 z-30 rounded-lg border border-gray-300 bg-white shadow-lg overflow-hidden flex flex-col max-h-72"
                  >
                    <button
                      type="button"
                      role="option"
                      onMouseDown={handleAddNewOuting}
                      className="w-full shrink-0 text-left px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 touch-target border-0 bg-white cursor-pointer"
                    >
                      Add new outing
                    </button>
                    <div className="h-1 w-full shrink-0 bg-gray-200" aria-hidden />
                    <div className="max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-b-lg" style={{ minHeight: '7.5rem' }}>
                      <div className="rounded-md border border-gray-200 bg-white overflow-hidden" style={{ minHeight: '7rem' }}>
                        {outingsLoading && (
                          <div className="px-3 py-3 text-sm text-gray-500">Loading outings…</div>
                        )}
                        {!outingsLoading && outings.length === 0 && (
                          <div className="px-3 py-3 text-sm text-gray-500">
                            No items are currently checked out
                          </div>
                        )}
                        {!outingsLoading &&
                          outings.length > 0 &&
                          filteredOutings.length === 0 && (
                            <div className="px-3 py-3 text-sm text-gray-500">
                              No outings found matching your search
                            </div>
                          )}
                        {!outingsLoading && filteredOutings.length > 0 && (
                          <div className="divide-y divide-gray-200">
                            {filteredOutings.map(outing => (
                              <button
                                key={outing.outingName}
                                type="button"
                                role="option"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => handleOutingSelect(outing.outingName)}
                                className={`w-full text-left px-3 py-3 text-sm border-0 bg-white hover:bg-gray-50 touch-target cursor-pointer ${
                                  selectedOuting === outing.outingName ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="font-semibold text-gray-900">{outing.outingName}</div>
                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600 mt-1">
                                  <span>
                                    📦 {outing.itemCount} item{outing.itemCount !== 1 ? 's' : ''}
                                  </span>
                                  <span>📅 {new Date(outing.checkedOutDate).toLocaleDateString()}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="scoutName" className={secondaryLabelClass}>
                  Checked out to (Outing Leader Name) *
                </label>
                <input
                  type="text"
                  id="scoutName"
                  name="scoutName"
                  value={formData.scoutName}
                  onChange={handleChange}
                  disabled={secondaryLocked}
                  required={outingNameReady}
                  className={secondaryFieldClass}
                  placeholder="Enter outing leader name"
                />
              </div>

              <div>
                <label htmlFor="qmName" className={secondaryLabelClass}>
                  Checked out by (QM name) *
                </label>
                <input
                  type="text"
                  id="qmName"
                  name="qmName"
                  value={formData.qmName}
                  onChange={handleChange}
                  disabled={secondaryLocked}
                  required={outingNameReady}
                  className={secondaryFieldClass}
                  placeholder="Enter quartermaster name"
                />
              </div>

              <div>
                <label htmlFor="date" className={secondaryLabelClass}>
                  Checkout Date *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  disabled={secondaryLocked}
                  required={outingNameReady}
                  className={secondaryFieldClass}
                />
              </div>

              <div>
                <label htmlFor="notes" className={secondaryLabelClass}>
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  disabled={secondaryLocked}
                  rows={3}
                  className={secondaryFieldClass}
                  placeholder="Any special notes or instructions..."
                />
              </div>
            </div>
          </form>

          {submitError && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{submitError}</p>
            </div>
          )}
        </div>
      </div>

      {outingNameReady && (
        <div className="bg-white border-t border-gray-200 p-4">
          <button
            type="submit"
            form="checkout-form"
            disabled={loading}
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
