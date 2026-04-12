import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import Toast from '../../components/Toast';
import HeaderProfileMenu from '../../components/HeaderProfileMenu';
import { useToast } from '../../hooks/useToast';
import { useInventory } from '../../hooks/useInventory';
import SearchableSegmentedToolbar from '../../components/SearchableSegmentedToolbar';
import { AnimateMain, SegmentSwitchAnimate } from '../../components/AnimateMain';
import AddItemForm from './AddItemForm';
import EditItemForm from './EditItemForm';
import { getApiBaseUrl } from '../../config/apiBaseUrl';
import useIsDesktop from '../../hooks/useIsDesktop';
import { useDesktopHeader } from '../../context/DesktopHeaderContext';

const VIEW_TABS = [
  { key: 'category', label: 'Categories' },
  { key: 'item', label: 'Items' },
  { key: 'outing', label: 'Events' },
];

const ViewInventory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast, showToast, hideToast } = useToast();
  const { getData } = useInventory();
  const isDesktop = useIsDesktop();

  useDesktopHeader({ title: 'Manage Items' });

  const [viewMode, setViewMode] = useState('category'); // 'category' | 'item' | 'outing'
  const [categoryStats, setCategoryStats] = useState([]);
  const [items, setItems] = useState([]);
  const [outings, setOutings] = useState([]);
  const [filteredCategory, setFilteredCategory] = useState(null);
  const [filteredStatus, setFilteredStatus] = useState(null);
  const [filteredOuting, setFilteredOuting] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingScrollToCategory, setPendingScrollToCategory] = useState(null);
  const [pendingScrollTop, setPendingScrollTop] = useState(null);
  const scrollContainerRef = useRef(null);

  const [addingItem, setAddingItem] = useState(false);
  const [addItemCategory, setAddItemCategory] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const buildReturnState = useCallback(
    () => ({
      viewMode,
      filteredCategory,
      filteredStatus,
      filteredOuting,
      searchQuery,
      searchOpen,
      scrollTop: scrollContainerRef.current?.scrollTop ?? 0,
    }),
    [viewMode, filteredCategory, filteredStatus, filteredOuting, searchQuery, searchOpen]
  );

  // Handle ?status= / ?view= from dashboard — outings tab, item list, optional status filter
  useEffect(() => {
    const status = searchParams.get('status');
    const view = searchParams.get('view');
    if (view === 'outings' || view === 'events') {
      setViewMode('outing');
    } else if (status) {
      setViewMode('item');
      setFilteredStatus(status);
    } else if (view === 'item') {
      setViewMode('item');
      setFilteredStatus(null);
    }
  }, []);

  // Restore list state / open modals from navigation state
  useEffect(() => {
    const s = location.state;
    if (!s) return;

    if (s.returnState) {
      const {
        viewMode: vm,
        filteredCategory: fc,
        filteredStatus: fs,
        filteredOuting: fo,
        searchQuery: sq,
        searchOpen: so,
        scrollTop: st,
      } = s.returnState;
      setViewMode(vm ?? 'category');
      setFilteredCategory(fc ?? null);
      setFilteredStatus(fs ?? null);
      setFilteredOuting(fo ?? null);
      setSearchQuery(sq ?? '');
      setSearchOpen(so ?? false);
      if (st) setPendingScrollTop(st);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    if (s.category) {
      setViewMode('item');
      setFilteredCategory(s.category);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    let consumed = false;
    if (s.openAddItem) {
      setAddingItem(true);
      if (s.selectedCategory) setAddItemCategory(s.selectedCategory);
      consumed = true;
    }
    if (s.editItemId) {
      setEditingItemId(s.editItemId);
      consumed = true;
    }
    if (s.deleteItemId) {
      setPendingDeleteItemId(s.deleteItemId);
      consumed = true;
    }
    if (consumed) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!pendingDeleteItemId) return;
    const found = items.find((i) => i.itemId === pendingDeleteItemId);
    if (found) {
      setDeleteTarget(found);
      setPendingDeleteItemId(null);
      return;
    }
    if (loading) return;
    getData(`/manage-inventory/items/${pendingDeleteItemId}`)
      .then((data) => {
        setDeleteTarget(data);
        setPendingDeleteItemId(null);
      })
      .catch(() => {
        showToast('Could not load item', 'error');
        setPendingDeleteItemId(null);
      });
  }, [pendingDeleteItemId, items, loading, getData, showToast]);

  useEffect(() => {
    const open = Boolean(addingItem || editingItemId || deleteTarget);
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [addingItem, editingItemId, deleteTarget]);

  useEffect(() => {
    if (!editingItemId && !addingItem && !deleteTarget) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (deleteTarget) setDeleteTarget(null);
      else if (editingItemId) setEditingItemId(null);
      else if (addingItem) {
        setAddingItem(false);
        setAddItemCategory(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingItemId, addingItem, deleteTarget]);

  // Scroll to top when switching to category view
  useEffect(() => {
    if (viewMode === 'category') {
      if (!isDesktop && scrollContainerRef.current) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
          }
        });
      }
      setPendingScrollToCategory(null);
    }
  }, [viewMode, isDesktop]);

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

  const fetchOutings = async () => {
    try {
      setLoading(true);
      const data = await getData('/inventory/outings');
      setOutings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching outings:', error);
      showToast('Failed to load events', 'error');
      setOutings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'category') {
      fetchCategoryStats();
      if (filteredStatus) fetchItems(); // need items to derive filtered category rows
    } else if (viewMode === 'item') {
      fetchItems();
    } else if (viewMode === 'outing') {
      fetchOutings();
    }
  }, [viewMode, filteredStatus]);

  // Perform pending scroll when category is set and view mode is 'item'
  useEffect(() => {
    if (viewMode === 'item' && pendingScrollToCategory && !loading) {
      if (isDesktop) {
        const id = setTimeout(() => {
          const el = document.getElementById(`category-${pendingScrollToCategory}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setPendingScrollToCategory(null);
        }, 250);
        return () => clearTimeout(id);
      }

      if (!scrollContainerRef.current) return;
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
  }, [viewMode, loading, pendingScrollToCategory, isDesktop]);

  // Restore scroll position when returning from edit
  useEffect(() => {
    if (pendingScrollTop !== null && !loading) {
      if (isDesktop) {
        setPendingScrollTop(null);
        return;
      }

      if (!scrollContainerRef.current) return;
      let cancelled = false;
      let timeoutIds = [];

      const attemptScroll = (retries = 0) => {
        if (cancelled) return;
        const container = scrollContainerRef.current;
        if (!container) return;

        container.scrollTop = pendingScrollTop;
        // If scrollTop didn't stick (content not yet tall enough), retry
        if (Math.abs(container.scrollTop - pendingScrollTop) < 5 || retries >= 4) {
          if (!cancelled) setPendingScrollTop(null);
        } else {
          const id = setTimeout(() => attemptScroll(retries + 1), 150);
          timeoutIds.push(id);
        }
      };

      const id = setTimeout(() => attemptScroll(), 250);
      timeoutIds.push(id);
      return () => {
        cancelled = true;
        timeoutIds.forEach(clearTimeout);
      };
    }
  }, [pendingScrollTop, loading, isDesktop]);

  // Filter categories by search (include item descriptions like Categories.jsx)
  const filteredCategories = categoryStats.filter(cat => {
    const searchLower = searchQuery.toLowerCase();
    return (
      cat.class_desc.toLowerCase().includes(searchLower) ||
      cat.class.toLowerCase().includes(searchLower) ||
      (cat.item_descriptions && cat.item_descriptions.toLowerCase().includes(searchLower))
    );
  });

  // When status filter active, derive category rows from items (not the API)
  const categoriesDisplay = filteredStatus
    ? Object.values(
        items
          .filter(item => item.status === filteredStatus &&
            (item.itemId.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))))
          .reduce((acc, item) => {
            if (!acc[item.itemClass]) {
              acc[item.itemClass] = { class: item.itemClass, class_desc: item.itemDesc, count: 0 };
            }
            acc[item.itemClass].count++;
            return acc;
          }, {})
      ).sort((a, b) => a.class_desc.localeCompare(b.class_desc))
    : filteredCategories;

  // Count of items matching active status / outing filters (for banner)
  const filteredStatusCount =
    filteredStatus || filteredOuting
      ? items.filter((i) => {
          const okStatus = !filteredStatus || i.status === filteredStatus;
          const okOuting = !filteredOuting || i.outingName === filteredOuting;
          return okStatus && okOuting;
        }).length
      : null;

  const filteredOutingsList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return outings;
    return outings.filter((o) => o.outingName.toLowerCase().includes(q));
  }, [outings, searchQuery]);

  const handleOutingSelect = (outingName) => {
    setViewMode('item');
    setFilteredStatus('Checked out');
    setFilteredOuting(outingName);
    setFilteredCategory(null);
    setSearchQuery('');
    setSearchOpen(false);
  };

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

  // Filter items by search, category, and status
  const filteredItems = Object.keys(groupedItems).reduce((result, classCode) => {
    const group = groupedItems[classCode];
    const filteredGroupItems = group.items.filter(item => {
      const matchesSearch =
        item.itemId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !filteredCategory || item.itemClass === filteredCategory;
      const matchesStatus = !filteredStatus || item.status === filteredStatus;
      const matchesOuting = !filteredOuting || item.outingName === filteredOuting;
      return matchesSearch && matchesCategory && matchesStatus && matchesOuting;
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
    // When a status filter is active, also narrow to this category so the list is focused
    setFilteredCategory(filteredStatus ? classCode : null);
    setSearchQuery('');
    setPendingScrollToCategory(classCode);
  };

  const handleDeleteClick = (item, e) => {
    if (e) e.stopPropagation();
    setDeleteTarget(item);
    setDeleteConfirmText('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteConfirmText.toLowerCase() !== 'delete item') return;
    try {
      setDeleteLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/manage-inventory/items/${deleteTarget.itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete');
      showToast('Item removed successfully', 'success');
      setDeleteTarget(null);
      setDeleteConfirmText('');
      await fetchItems();
      if (viewMode === 'category') await fetchCategoryStats();
    } catch (err) {
      showToast(err.message || 'Failed to remove item. Please try again.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const refreshAfterMutation = async () => {
    await fetchItems();
    if (viewMode === 'category') await fetchCategoryStats();
    if (viewMode === 'outing') await fetchOutings();
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
    <div className={isDesktop ? '' : 'h-screen-small flex flex-col bg-gray-100'}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Header */}
      {!isDesktop && (
        <div className="header">
          <Link
            to="/manage-inventory"
            className="back-button no-underline"
          >
            ←
          </Link>
          <h1>Manage Items</h1>
          <HeaderProfileMenu />
        </div>
      )}

      <AnimateMain className={isDesktop ? 'flex flex-col' : 'flex flex-1 flex-col min-h-0'}>
      <SearchableSegmentedToolbar
        tabs={VIEW_TABS}
        segmentValue={viewMode}
        onSegmentChange={(key) => {
          setViewMode(key);
          setFilteredCategory(null);
          setFilteredOuting(null);
          setSearchQuery('');
          setPendingScrollToCategory(null);
          if (key === 'outing') {
            setFilteredStatus(null);
          }
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchPlaceholder={
          viewMode === 'category'
            ? 'Search categories...'
            : viewMode === 'outing'
              ? 'Search events...'
              : 'Search items...'
        }
        toolbarAccessory={
          <button
            type="button"
            onClick={() => {
              setAddingItem(true);
              setAddItemCategory(null);
            }}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full border border-scout-blue/20 bg-scout-blue/12 px-2.5 py-2 text-xs font-medium text-scout-blue touch-target transition-colors hover:bg-scout-blue/18 active:bg-scout-blue/22 sm:gap-1.5 sm:px-3 sm:text-sm"
            aria-label="Add item"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            <span>Add</span>
          </button>
        }
      />

      {/* Filter banner — full-width, below toggle/search */}
      {(filteredStatus || filteredOuting) && (
        <div
          className={`bg-scout-blue/8 border-b border-scout-blue/15 px-5 py-2 flex items-center ${
            filteredStatus === 'Checked out' && !filteredOuting ? 'justify-start' : 'justify-between'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-2 w-2 shrink-0 rounded-full bg-scout-blue/60"></div>
            <span className="min-w-0 text-sm font-medium text-scout-blue">
              {filteredOuting && (
                <>
                  Event: <span className="font-semibold">{filteredOuting}</span>
                </>
              )}
              {filteredOuting && filteredStatus && (
                <span className="font-normal text-scout-blue/70"> · </span>
              )}
              {filteredStatus && <span>{filteredStatus}</span>}
              {filteredStatusCount !== null && (
                <span className="font-normal text-scout-blue/70"> · {filteredStatusCount} items</span>
              )}
            </span>
          </div>
          {!(filteredStatus === 'Checked out' && !filteredOuting) && (
            <button
              type="button"
              onClick={() => {
                setFilteredStatus(null);
                setFilteredCategory(null);
                setFilteredOuting(null);
              }}
              className="touch-target shrink-0 text-xs font-medium text-scout-blue/50 hover:text-scout-blue"
              aria-label="Clear filter"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Scrollable Content */}
      <div ref={scrollContainerRef} className={isDesktop ? '' : 'flex-1 overflow-y-auto'}>
        <SegmentSwitchAnimate key={viewMode} className="min-h-0">
        <div className={isDesktop ? 'py-5' : 'px-5 py-5 pb-20'}>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-scout-blue"></div>
          </div>
        ) : viewMode === 'category' ? (
          /* Category View */
          <div className="space-y-3">
            {categoriesDisplay.map((cat) => (
              <div
                key={cat.class}
                onClick={() => scrollToCategory(cat.class)}
                className="card touch-target block cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{cat.class_desc}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {filteredStatus
                        ? `${cat.count} ${filteredStatus.toLowerCase()}`
                        : `${cat.total_items} total • ${cat.available} avail • ${cat.checked_out} out • ${cat.unavailable} unavail`
                      }
                    </p>
                  </div>
                  <span className="text-gray-400 text-xl">›</span>
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'outing' ? (
          <div className="space-y-3">
            {filteredOutingsList.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                {searchQuery.trim()
                  ? 'No events match your search.'
                  : 'No active events with checked-out gear.'}
              </p>
            ) : (
              filteredOutingsList.map((o) => (
                <button
                  key={o.outingName}
                  type="button"
                  onClick={() => handleOutingSelect(o.outingName)}
                  className="card touch-target block w-full cursor-pointer text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900">{o.outingName}</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'} out
                        {o.checkedOutDate ? (
                          <span className="text-gray-500"> · Out {o.checkedOutDate}</span>
                        ) : null}
                      </p>
                    </div>
                    <span className="text-xl text-gray-400" aria-hidden>
                      ›
                    </span>
                  </div>
                </button>
              ))
            )}
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
                            onClick={() => setEditingItemId(item.itemId)}
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
                            {item.status === 'Reserved' && item.outingName && (
                              <p className="text-xs text-gray-600 mt-1">Reserved for: {item.outingName}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(item, e)}
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
        </SegmentSwitchAnimate>
      </div>
      </AnimateMain>

      {addingItem && (
        <div
          className="modal-dialog-overlay-root select-none z-[100]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-item-modal-title"
        >
          <div
            role="presentation"
            aria-hidden
            className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
            onClick={() => {
              setAddingItem(false);
              setAddItemCategory(null);
            }}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-6">
            <div className="modal-dialog-panel-enter pointer-events-auto relative z-[101] flex max-h-[96dvh] w-full max-w-md lg:max-w-xl flex-col overflow-hidden rounded-2xl bg-gray-100 shadow-2xl">
            <div className="header shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAddingItem(false);
                  setAddItemCategory(null);
                }}
                className="back-button"
                aria-label="Close"
              >
                ←
              </button>
              <h1 id="add-item-modal-title">Add New Item</h1>
              <HeaderProfileMenu />
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AddItemForm
              isModal
              initialCategory={addItemCategory}
              onClose={() => {
                setAddingItem(false);
                setAddItemCategory(null);
              }}
              onSuccess={async () => {
                await refreshAfterMutation();
                setAddingItem(false);
                setAddItemCategory(null);
              }}
              onOpenCategoryPicker={() =>
                navigate('/manage-inventory/select-category', { state: { fromAddFlow: true } })
              }
            />
            </div>
          </div>
          </div>
        </div>
      )}

      {editingItemId && (
        <div
          className="modal-dialog-overlay-root select-none z-[100]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-inventory-edit-item-title"
        >
          <div
            role="presentation"
            aria-hidden
            className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
            onClick={() => setEditingItemId(null)}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-6">
            <div className="modal-dialog-panel-enter pointer-events-auto relative z-[101] flex max-h-[96dvh] w-full max-w-md lg:max-w-xl flex-col overflow-hidden rounded-2xl bg-gray-100 shadow-2xl">
            <div className="header shrink-0">
              <button
                type="button"
                onClick={() => setEditingItemId(null)}
                className="back-button"
                aria-label="Close"
              >
                ←
              </button>
              <h1 id="view-inventory-edit-item-title">Edit Item</h1>
              <HeaderProfileMenu />
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <EditItemForm
                key={editingItemId}
                itemId={editingItemId}
                isModal
                returnState={{ returnState: buildReturnState() }}
                onClose={() => setEditingItemId(null)}
                onSuccess={async () => {
                  await refreshAfterMutation();
                  setEditingItemId(null);
                }}
              />
            </div>
          </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className={`modal-dialog-overlay-root select-none ${
            editingItemId || addingItem ? 'z-[120]' : ''
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-inventory-delete-item-title"
        >
          <div
            role="presentation"
            aria-hidden
            className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
            onClick={() => {
              if (!deleteLoading) {
                setDeleteTarget(null);
                setDeleteConfirmText('');
              }
            }}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
            <div className="modal-dialog-panel-enter pointer-events-auto relative z-[101] max-h-[min(90dvh,36rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-10 shadow-2xl lg:max-w-xl">
            <h2 id="view-inventory-delete-item-title" className="mb-1 text-lg font-bold text-gray-900">Remove item?</h2>
            <p className="mb-1 text-sm text-gray-600">
              <span className="font-medium">{deleteTarget.itemId}</span>
            </p>
            <p className="mb-2 text-sm text-gray-500">{deleteTarget.description}</p>
            <p className="mb-4 text-sm text-gray-500">
              This marks the item as &quot;Removed from inventory&quot; and hides it from the app. History is
              preserved.
            </p>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Type &quot;delete item&quot; to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3"
              placeholder="delete item"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmText('');
                }}
                disabled={deleteLoading}
                className="touch-target h-12 flex-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading || deleteConfirmText.toLowerCase() !== 'delete item'}
                className="touch-target h-12 flex-1 rounded-md bg-scout-red/12 border border-scout-red/20 text-sm font-medium text-scout-red disabled:opacity-50"
              >
                {deleteLoading ? 'Removing…' : 'Remove'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewInventory;
