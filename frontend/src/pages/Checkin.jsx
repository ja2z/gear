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
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1>
          {selectedOuting ? `Check In: ${selectedOuting}` : 'Check In Gear'}
        </h1>
        <div className="w-10 h-10"></div>
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

      {/* Multi-select notice */}
      <div className="bg-blue-50 border border-blue-100 px-5 py-3 mx-5 mt-5 rounded-lg">
        <p className="text-scout-blue text-sm text-center">
          Tap items to select
        </p>
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
                onClick={() => handleItemSelect(item)}
                className={`card cursor-pointer transition-all duration-200 ${
                  isSelected ? 'card-selected' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 leading-none">
                        {item.itemId}
                      </h3>
                      <p className="text-sm text-gray-600 leading-none -mt-0.5">{item.description}</p>
                      <p className="text-xs text-gray-500 leading-none -mt-0.5">
                        Checked out to: {item.checkedOutTo}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Condition:
                  </label>
                  <div className="flex space-x-2">
                    {['Usable', 'Not usable', 'Missing'].map((condition) => (
                      <button
                        key={condition}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConditionChange(item.itemId, condition);
                        }}
                        disabled={!isSelected}
                        className={`px-4 py-2 text-sm rounded-full border border-gray-300 touch-target transition-all duration-200 ${
                          isSelected && isSelected.condition === condition
                            ? 'bg-scout-blue text-white'
                            : isSelected
                            ? 'bg-white text-gray-700 hover:bg-gray-50'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        style={{
                          boxShadow: 'none !important',
                          textShadow: 'none !important',
                          filter: 'none !important',
                          outline: 'none !important',
                          borderStyle: 'solid',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none'
                        }}
                      >
                        {condition}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No checked out items found matching your search</p>
          </div>
        )}

        {/* Error Display */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{submitError}</p>
          </div>
        )}

          {/* Submit Button - Always Visible */}
          <div 
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'white',
              borderTop: '1px solid #e5e7eb',
              padding: '1rem',
              zIndex: 50,
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <button
              onClick={handleSubmit}
              disabled={loading || selectedItems.length === 0}
              style={{
                width: '100%',
                height: '3rem',
                backgroundColor: selectedItems.length > 0 ? '#1E398A' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '1rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (loading || selectedItems.length === 0) ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.2s',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
              }}
            >
              {loading 
                ? 'Processing...' 
                : selectedItems.length === 0 
                  ? 'Check In 0 Items'
                  : `Check In ${selectedItems.length} Item${selectedItems.length > 1 ? 's' : ''}`
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkin;
