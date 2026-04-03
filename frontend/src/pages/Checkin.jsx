import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import ConnectionError from '../components/ConnectionError';
import SegmentedControl from '../components/SegmentedControl';

const Checkin = () => {
  const { getData, loading, clearCache } = useInventory();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('outings'); // 'categories' | 'items' | 'outings'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [submitError, setSubmitError] = useState(null);
  const [filteredOuting, setFilteredOuting] = useState(null);
  const [filteredCategory, setFilteredCategory] = useState(null);
  const [allCheckedOutItems, setAllCheckedOutItems] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true);
        setConnectionError(false);
        clearCache();
        const inventory = await getData('/inventory', true);
        const checkedOut = inventory.filter(item => item.status === 'Checked out');
        setAllCheckedOutItems(checkedOut);
      } catch (err) {
        console.error('Error fetching checked out items:', err);
        setConnectionError(true);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, []);

  // Derive outings (only items with an outing name)
  const outingsMap = allCheckedOutItems.reduce((acc, item) => {
    const name = item.outingName;
    if (!name) return acc;
    if (!acc[name]) {
      acc[name] = { outingName: name, items: [] };
    }
    acc[name].items.push(item);
    return acc;
  }, {});
  const outings = Object.values(outingsMap).sort((a, b) =>
    a.outingName.localeCompare(b.outingName)
  );

  // Derive categories
  const categoriesMap = allCheckedOutItems.reduce((acc, item) => {
    const cls = item.itemClass;
    if (!cls) return acc;
    if (!acc[cls]) {
      acc[cls] = { classCode: cls, classDesc: item.itemDesc || cls, items: [] };
    }
    acc[cls].items.push(item);
    return acc;
  }, {});
  const categories = Object.values(categoriesMap).sort((a, b) =>
    a.classDesc.localeCompare(b.classDesc)
  );

  const searchLower = searchQuery.toLowerCase();

  const filteredOutings = outings.filter(outing => {
    if (!searchLower) return true;
    return (
      outing.outingName.toLowerCase().includes(searchLower) ||
      outing.items.some(item =>
        item.itemId.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        (item.itemClass && item.itemClass.toLowerCase().includes(searchLower)) ||
        (item.itemDesc && item.itemDesc.toLowerCase().includes(searchLower))
      )
    );
  });

  const filteredCategories = categories.filter(cat => {
    if (!searchLower) return true;
    return (
      cat.classDesc.toLowerCase().includes(searchLower) ||
      cat.classCode.toLowerCase().includes(searchLower) ||
      cat.items.some(item =>
        item.itemId.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower))
      )
    );
  });

  const filteredItems = allCheckedOutItems.filter(item => {
    const matchesSearch = !searchLower || (
      item.itemId.toLowerCase().includes(searchLower) ||
      (item.description && item.description.toLowerCase().includes(searchLower)) ||
      (item.checkedOutTo && item.checkedOutTo.toLowerCase().includes(searchLower)) ||
      (item.outingName && item.outingName.toLowerCase().includes(searchLower))
    );
    const matchesOuting = !filteredOuting || item.outingName === filteredOuting;
    const matchesCategory = !filteredCategory || item.itemClass === filteredCategory;
    return matchesSearch && matchesOuting && matchesCategory;
  });

  const handleOutingClick = (outingName) => {
    setFilteredOuting(outingName);
    setFilteredCategory(null);
    setSearchQuery('');
    setViewMode('items');
  };

  const handleCategoryClick = (classCode) => {
    setFilteredCategory(classCode);
    setFilteredOuting(null);
    setSearchQuery('');
    setViewMode('items');
  };

  const handleItemSelect = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.itemId === item.itemId);
      if (exists) return prev.filter(i => i.itemId !== item.itemId);
      return [...prev, { ...item, condition: 'Usable' }];
    });
  };

  const handleConditionChange = (itemId, condition) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.itemId === itemId);
      if (existing) {
        return prev.map(i => i.itemId === itemId ? { ...i, condition } : i);
      }
      const item = allCheckedOutItems.find(i => i.itemId === itemId);
      if (item) return [...prev, { ...item, condition }];
      return prev;
    });
  };

  const handleSubmit = () => {
    if (selectedItems.length === 0) {
      setSubmitError('Please select at least one item to check in.');
      return;
    }
    setSubmitError(null);
    navigate('/checkin/form', {
      state: { selectedItems, selectedOuting: filteredOuting }
    });
  };

  if (connectionError) {
    return (
      <ConnectionError
        onRetry={() => window.location.reload()}
        onGoHome={() => navigate('/')}
      />
    );
  }

  const tabs = [
    { key: 'categories', label: 'Categories' },
    { key: 'items', label: 'Items' },
    { key: 'outings', label: 'Outings' },
  ];

  const searchPlaceholder =
    viewMode === 'outings' ? 'Search outings or items...' :
    viewMode === 'categories' ? 'Search categories or items...' :
    'Search items...';

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link to="/" className="back-button no-underline">←</Link>
        <h1>Check In Gear</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Toggle row OR Search bar */}
      {searchOpen ? (
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              autoFocus
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input w-full pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-target flex items-center justify-center"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
            className="text-gray-600 font-medium text-sm whitespace-nowrap touch-target px-1"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="bg-white px-5 py-2 border-b border-gray-200 flex items-center gap-2">
          <SegmentedControl
            tabs={tabs}
            value={viewMode}
            onChange={(key) => { setViewMode(key); setSearchQuery(''); }}
          />
          <button
            onClick={() => setSearchOpen(true)}
            className="text-gray-500 touch-target flex items-center justify-center"
            aria-label="Search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      )}

      {/* Active filter banners */}
      {filteredOuting && (
        <div className="bg-scout-blue/8 border-b border-scout-blue/15 px-5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-scout-blue/60 shrink-0"></div>
            <span className="text-scout-blue text-sm font-medium">{filteredOuting}</span>
          </div>
          <button
            onClick={() => setFilteredOuting(null)}
            className="text-scout-blue/50 hover:text-scout-blue text-xs font-medium touch-target"
          >
            Clear
          </button>
        </div>
      )}
      {filteredCategory && (
        <div className="bg-scout-blue/8 border-b border-scout-blue/15 px-5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-scout-blue/60 shrink-0"></div>
            <span className="text-scout-blue text-sm font-medium">
              {categoriesMap[filteredCategory]?.classDesc || filteredCategory}
            </span>
          </div>
          <button
            onClick={() => setFilteredCategory(null)}
            className="text-scout-blue/50 hover:text-scout-blue text-xs font-medium touch-target"
          >
            Clear
          </button>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {dataLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-scout-blue"></div>
          </div>
        ) : (
          <div className="px-5 py-5 pb-20">

            {/* Outings View */}
            {viewMode === 'outings' && (
              <div className="space-y-3">
                {filteredOutings.map(outing => (
                  <div
                    key={outing.outingName}
                    className="card card-compact cursor-pointer hover:shadow-card-hover transition-all"
                    onClick={() => handleOutingClick(outing.outingName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 m-0">
                          {outing.outingName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {outing.items.length} item{outing.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className="text-gray-400 text-xl">›</span>
                    </div>
                  </div>
                ))}
                {filteredOutings.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      {allCheckedOutItems.length === 0
                        ? 'No items are currently checked out'
                        : 'No outings match your search'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Categories View */}
            {viewMode === 'categories' && (
              <div className="space-y-3">
                {filteredCategories.map(cat => (
                  <div
                    key={cat.classCode}
                    className="card cursor-pointer touch-target"
                    onClick={() => handleCategoryClick(cat.classCode)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{cat.classDesc}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {cat.items.length} checked out
                        </p>
                      </div>
                      <span className="text-gray-400 text-xl">›</span>
                    </div>
                  </div>
                ))}
                {filteredCategories.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      {allCheckedOutItems.length === 0
                        ? 'No items are currently checked out'
                        : 'No categories match your search'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Items View */}
            {viewMode === 'items' && (
              <>
                <div className="bg-blue-50 border border-blue-100 px-5 py-3 mb-4 rounded-lg">
                  <p className="text-scout-blue text-sm text-center">
                    Tap items or click condition to select
                  </p>
                </div>
                <div className="space-y-3 mb-6">
                  {filteredItems.map((item) => {
                    const isSelected = selectedItems.find(i => i.itemId === item.itemId);
                    return (
                      <div
                        key={item.itemId}
                        onClick={() => handleItemSelect(item)}
                        className={`card card-compact cursor-pointer transition-all duration-200 ${
                          isSelected ? 'card-selected' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {item.itemId}
                          </h3>
                          <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                          <p className="text-xs text-gray-700">
                            Checked out to: {item.checkedOutTo}
                          </p>
                          {item.outingName && (
                            <p className="text-xs text-gray-500">Outing: {item.outingName}</p>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Item Condition:
                          </label>
                          <select
                            value={isSelected ? isSelected.condition : 'Usable'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleConditionChange(item.itemId, e.target.value);
                            }}
                            className="form-input w-full rounded-lg border border-gray-300 bg-white text-gray-800 text-sm py-2 px-3"
                          >
                            <option value="Usable">Usable</option>
                            <option value="Not usable">Not usable</option>
                            <option value="Missing">Missing</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {filteredItems.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      {allCheckedOutItems.length === 0
                        ? 'No items are currently checked out'
                        : 'No items match your search'}
                    </p>
                  </div>
                )}
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-800 text-sm">{submitError}</p>
                  </div>
                )}
              </>
            )}

          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="bg-white border-t border-gray-200 p-4">
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
  );
};

export default Checkin;
