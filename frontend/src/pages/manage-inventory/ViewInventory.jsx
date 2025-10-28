import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useInventory } from '../../hooks/useInventory';

const ViewInventory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, showToast, hideToast } = useToast();
  const { getData } = useInventory();
  
  const [viewMode, setViewMode] = useState('category'); // 'category' or 'item'
  const [categoryStats, setCategoryStats] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredCategory, setFilteredCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingScrollToCategory, setPendingScrollToCategory] = useState(null);
  const scrollContainerRef = useRef(null);

  // Check if navigated from edit/delete with category filter
  useEffect(() => {
    if (location.state?.category) {
      setViewMode('item');
      setFilteredCategory(location.state.category);
      // Clear the location state so it doesn't interfere with subsequent clicks
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Scroll to top when switching to category view
  useEffect(() => {
    if (viewMode === 'category' && scrollContainerRef.current) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      });
      setPendingScrollToCategory(null); // Clear any pending scroll
    }
  }, [viewMode]);

  // Fetch category stats
  const fetchCategoryStats = async () => {
    try {
      setLoading(true);
      const data = await getData('/manage-inventory/category-stats');
      setCategoryStats(data);
    } catch (error) {
      console.error('Error fetching category stats:', error);
      showToast('Failed to load category statistics', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all items (including items not in app if toggle is on)
  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await getData('/manage-inventory/items');
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      showToast('Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'category') {
      fetchCategoryStats();
    } else {
      fetchItems();
    }
  }, [viewMode]);

  // Perform pending scroll when category is set and view mode is 'item'
  useEffect(() => {
    if (viewMode === 'item' && pendingScrollToCategory && !loading && scrollContainerRef.current) {
      let cancelled = false;
      let timeoutIds = [];
      
      // Use setTimeout for better mobile browser compatibility
      // Mobile browsers need more time for DOM to settle after state changes
      const attemptScroll = (retries = 0) => {
        if (cancelled) return;
        
        const element = document.getElementById(`category-${pendingScrollToCategory}`);
        const container = scrollContainerRef.current;
        
        if (element && container) {
          // Get the element's position relative to the container
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          
          // Calculate the scroll position
          const offset = 20; // padding from top
          const targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top) - offset;
          
          // Try smooth scroll first, but have a fallback
          try {
            container.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });
          } catch (e) {
            // Fallback for older browsers
            container.scrollTop = targetScrollTop;
          }
          setPendingScrollToCategory(null);
        } else if (retries < 3) {
          // Element not found, retry after a short delay (mobile DOM might not be ready)
          const retryTimeoutId = setTimeout(() => attemptScroll(retries + 1), 100);
          timeoutIds.push(retryTimeoutId);
        } else {
          // Give up after 3 retries
          setPendingScrollToCategory(null);
        }
      };
      
      const initialTimeoutId = setTimeout(() => attemptScroll(), 250);
      timeoutIds.push(initialTimeoutId);
      
      return () => {
        cancelled = true;
        timeoutIds.forEach(id => clearTimeout(id));
      };
    }
  }, [viewMode, loading, pendingScrollToCategory]);

  // Filter categories by search (include item descriptions like Categories.jsx)
  const filteredCategories = categoryStats.filter(cat => {
    const searchLower = searchQuery.toLowerCase();
    return (
      cat.class_desc.toLowerCase().includes(searchLower) ||
      cat.class.toLowerCase().includes(searchLower) ||
      (cat.item_descriptions && cat.item_descriptions.toLowerCase().includes(searchLower))
    );
  });

  // Group items by category (always show all items)
  const groupedItems = items.reduce((groups, item) => {
    if (!groups[item.itemClass]) {
      groups[item.itemClass] = {
        classDesc: item.itemDesc,
        items: []
      };
    }
    groups[item.itemClass].items.push(item);
    return groups;
  }, {});

  // Filter items by search and category (search includes itemId and description)
  const filteredItems = Object.keys(groupedItems).reduce((result, classCode) => {
    const group = groupedItems[classCode];
    const filteredGroupItems = group.items.filter(item => {
      const matchesSearch = 
        item.itemId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !filteredCategory || item.itemClass === filteredCategory;
      return matchesSearch && matchesCategory;
    });

    if (filteredGroupItems.length > 0) {
      result[classCode] = {
        ...group,
        items: filteredGroupItems
      };
    }
    return result;
  }, {});

  const scrollToCategory = (classCode) => {
    setViewMode('item');
    setFilteredCategory(null); // Clear any category filter
    setSearchQuery('');
    setPendingScrollToCategory(classCode); // Set pending scroll - will execute after items load
  };

  const handleDeleteClick = (itemId) => {
    navigate(`/manage-inventory/delete-item/${itemId}`);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'In shed': return 'status-in-shed';
      case 'Checked out': return 'status-checked-out';
      case 'Missing': return 'status-missing';
      case 'Out for repair': return 'status-out-for-repair';
      default: return 'status-condition-unknown';
    }
  };

  const getConditionBadgeClass = (condition) => {
    switch (condition) {
      case 'Usable': return 'status-in-shed';
      case 'Not usable': return 'status-unusable';
      case 'Unknown': return 'status-condition-unknown';
      default: return 'status-condition-unknown';
    }
  };

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Header */}
      <div className="header">
        <Link
          to="/manage-inventory"
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1>Manage Items</h1>
        <Link
          to="/manage-inventory/add-item"
          className="cart-badge no-underline"
          aria-label="Add item"
        >
          <svg className="add-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </Link>
      </div>

      {/* Toggle Control */}
      <div className="bg-white px-5 py-3 border-b border-gray-200">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => {
              setViewMode('category');
              setFilteredCategory(null);
              setSearchQuery('');
              setPendingScrollToCategory(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all touch-target ${
              viewMode === 'category'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            By Category
          </button>
          <button
            onClick={() => {
              setViewMode('item');
              setFilteredCategory(null);
              setSearchQuery('');
              setPendingScrollToCategory(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all touch-target ${
              viewMode === 'item'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            By Item
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white px-5 py-4 border-b border-gray-200">
        <input
          type="text"
          placeholder={viewMode === 'category' ? 'Search categories...' : 'Search items...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Scrollable Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="px-5 py-5 pb-20">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-scout-blue"></div>
          </div>
        ) : viewMode === 'category' ? (
          /* Category View */
          <div className="space-y-3">
            {filteredCategories.map((cat) => (
              <div
                key={cat.class}
                onClick={() => scrollToCategory(cat.class)}
                className="card touch-target block cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{cat.class_desc}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {cat.total_items} total • {cat.available} avail • {cat.checked_out} out • {cat.unavailable} unavail
                    </p>
                  </div>
                  <span className="text-gray-400 text-xl">›</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Item View */
          <div className="space-y-3">
            {Object.keys(filteredItems).map((classCode) => {
              const group = filteredItems[classCode];
              return (
                <div key={classCode}>
                  {/* Category Header with Anchor */}
                  <div id={`category-${classCode}`} className="mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">{group.classDesc}</h2>
                  </div>
                  
                  {/* Items */}
                  <div className="space-y-3 mb-6">
                    {group.items.map((item) => (
                      <div
                        key={item.itemId}
                        className="card"
                      >
                        <div className="flex justify-between items-start">
                        <div
                            className="flex-1 cursor-pointer"
                            onClick={() => navigate(`/manage-inventory/edit-item/${item.itemId}`)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{item.itemId}</span>
                              <button className="text-blue-500 hover:text-blue-700">
                                ✏️
                              </button>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className={getStatusBadgeClass(item.status)}>
                                {item.status}
                              </span>
                              <span className={getConditionBadgeClass(item.condition)}>
                                {item.condition}
                              </span>
                              {!item.inApp && (
                                <span className="status-not-in-app">
                                  Not in app
                                </span>
                              )}
                            </div>
                            {item.status === 'Checked out' && item.outingName && (
                              <p className="text-xs text-gray-600 mt-1">On: {item.outingName}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteClick(item.itemId)}
                            className="remove-item-btn-clean ml-3 touch-target"
                            title="Remove item"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ViewInventory;

