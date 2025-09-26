import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import ConnectionError from '../components/ConnectionError';

const Checkin = () => {
  const { getData, postData, loading, clearCache } = useInventory();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [submitError, setSubmitError] = useState(null);
  const [selectedOuting, setSelectedOuting] = useState(null);
  const [allCheckedOutItems, setAllCheckedOutItems] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const hasInitialized = useRef(false);

  // Get outing from URL params and fetch data
  useEffect(() => {
    const outing = searchParams.get('outing');
    // Clear cache when outing changes to prevent stale data
    clearCache();
    setSelectedOuting(outing);
    hasInitialized.current = true;
  }, [searchParams, clearCache]);

  // Fetch checked out items data
  useEffect(() => {
    const fetchCheckedOutItems = async () => {
      try {
        setDataLoading(true);
        setDataError(null);
        setConnectionError(false);
        
        // Clear previous data immediately to prevent stale data display
        setAllCheckedOutItems([]);
        
        if (selectedOuting) {
          // Fetch items for specific outing with force refresh to prevent cache issues
          const endpoint = `/inventory/checked-out/${encodeURIComponent(selectedOuting)}`;
          const data = await getData(endpoint, true);
          setAllCheckedOutItems(data);
        } else {
          // Fetch all checked out items (for general checkin)
          const inventory = await getData('/inventory', true);
          const checkedOutItems = inventory.filter(item => item.status === 'Checked out');
          setAllCheckedOutItems(checkedOutItems);
        }
      } catch (err) {
        console.error('Error fetching checked out items:', err);
        setConnectionError(true);
      } finally {
        setDataLoading(false);
      }
    };

    // Only fetch if we have a selectedOuting (prevent the null case from running)
    if (selectedOuting) {
      fetchCheckedOutItems();
    }
  }, [selectedOuting]); // Remove getData dependency to prevent infinite re-renders

  // Filter items by selected outing (if not already filtered by API)
  const checkedOutItems = selectedOuting 
    ? allCheckedOutItems // Already filtered by API for specific outing
    : allCheckedOutItems;


  const filteredItems = checkedOutItems.filter(item =>
    item.itemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.checkedOutTo && item.checkedOutTo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleItemSelect = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.itemId === item.itemId);
      if (exists) {
        return prev.filter(i => i.itemId !== item.itemId);
      } else {
        return [...prev, { ...item, condition: 'Usable' }];
      }
    });
  };

  const handleConditionChange = (itemId, condition) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.itemId === itemId ? { ...item, condition } : item
      )
    );
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      setSubmitError('Please select at least one item to check in.');
      return;
    }

    setSubmitError(null);

    try {
      const itemIds = selectedItems.map(item => item.itemId);
      const conditions = selectedItems.map(item => item.condition);
      
      const checkinData = {
        itemIds,
        conditions,
        processedBy: 'System User', // TODO: Get from auth context
        notes: 'Checked in via mobile app'
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

  const handleRetry = () => {
    setConnectionError(false);
    // Trigger a re-fetch by updating the dependency
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (connectionError) {
    return <ConnectionError onRetry={handleRetry} onGoHome={handleGoHome} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link
          to={selectedOuting ? "/checkin/outings" : "/"}
          className="back-button"
        >
          ←
        </Link>
        <h1>
          {selectedOuting ? `Check In: ${selectedOuting}` : 'Check In Gear'}
        </h1>
        <div></div>
      </div>

      {/* Search */}
      <div className="bg-white px-5 py-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search checked out items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Error Display */}
      {dataError && (
        <div className="px-5 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{dataError}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {dataLoading && (
        <div className="px-5 py-12">
          <div className="text-center">
            <p className="text-gray-500">Loading checked out items...</p>
          </div>
        </div>
      )}

      {/* Items List */}
      {!dataLoading && !dataError && (
        <div className="px-5 py-5 pb-20">
        <div className="space-y-3 mb-6">
          {filteredItems.map((item) => {
            const isSelected = selectedItems.find(i => i.itemId === item.itemId);
            return (
              <div
                key={item.itemId}
                className={`card ${
                  isSelected ? 'card-selected' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleItemSelect(item)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center touch-target ${
                          isSelected ? 'bg-scout-blue border-scout-blue text-white' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <span className="text-sm">✓</span>}
                      </button>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.itemId}
                        </h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <p className="text-xs text-gray-500">
                          Checked out to: {item.checkedOutTo}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Condition:
                    </label>
                    <div className="flex space-x-2">
                      {['Usable', 'Not usable', 'Missing'].map((condition) => (
                        <button
                          key={condition}
                          onClick={() => handleConditionChange(item.itemId, condition)}
                          className={`px-3 py-1 text-sm rounded-full border touch-target ${
                            isSelected.condition === condition
                              ? 'bg-scout-blue text-white border-scout-blue'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {condition}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No checked out items found matching your search.</p>
          </div>
        )}

        {/* Error Display */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{submitError}</p>
          </div>
        )}

          {/* Submit Button */}
          {selectedItems.length > 0 && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-full h-12 text-base font-medium px-6 has-[>svg]:px-4 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
              >
                {loading ? 'Processing...' : `Check In ${selectedItems.length} Item${selectedItems.length > 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Checkin;
