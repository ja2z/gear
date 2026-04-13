import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';
import ConnectionError from '../components/ConnectionError';
import SearchableSegmentedToolbar from '../components/SearchableSegmentedToolbar';
import { AnimateMain, SegmentSwitchAnimate } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import CheckinOutingModal from '../components/CheckinOutingModal';
import CartCheckinModal from '../components/CartCheckinModal';
import { eventKindLabel } from '../utils/eventKindLabel';

const Checkin = () => {
  const { getData, clearCache } = useInventory();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  useDesktopHeader({ title: 'Check In', subtitle: 'Return gear to the shed' });

  const [viewMode, setViewMode] = useState('items'); // 'categories' | 'items' — outing is chosen in the modal first
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [submitError, setSubmitError] = useState(null);
  const [filteredOuting, setFilteredOuting] = useState(null);
  const [filteredCategory, setFilteredCategory] = useState(null);
  const [allCheckedOutItems, setAllCheckedOutItems] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  /** Set after CheckinOutingModal — must match `items.outing_name` for checked-out rows */
  const [checkinEvent, setCheckinEvent] = useState(null);
  const [checkinConfirmOpen, setCheckinConfirmOpen] = useState(false);

  const checkinEventRef = useRef(checkinEvent);
  checkinEventRef.current = checkinEvent;

  useEffect(() => {
    if (checkinEvent?.allEvents || !checkinEvent?.eventId || checkinEvent.eventType) return;
    let cancelled = false;
    const id = checkinEvent.eventId;
    getData(`/events/${id}`)
      .then((ev) => {
        if (cancelled || !ev?.eventType) return;
        const prev = checkinEventRef.current;
        if (!prev || String(prev.eventId) !== String(id)) return;
        setCheckinEvent({ ...prev, eventType: ev.eventType });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [checkinEvent?.eventId, checkinEvent?.eventType, getData]);

  const effectiveItems = useMemo(() => {
    if (!checkinEvent) return [];
    if (checkinEvent.allEvents) return allCheckedOutItems;
    const name = checkinEvent.outingName != null ? String(checkinEvent.outingName).trim() : '';
    if (!name) return [];
    return allCheckedOutItems.filter(
      (i) => String(i.outingName || '').trim() === name
    );
  }, [allCheckedOutItems, checkinEvent]);

  useLayoutEffect(() => {
    const payload = location.state?.checkinEvent;
    if (payload?.allEvents) {
      setCheckinEvent({ allEvents: true });
      setFilteredOuting(null);
      setFilteredCategory(null);
      setViewMode('items');
      setSelectedItems([]);
      setSubmitError(null);
      setSearchQuery('');
      navigate('/checkin', { replace: true, state: {} });
      return;
    }
    if (!payload?.eventId || !payload?.outingName) return;
    setCheckinEvent(payload);
    setFilteredOuting(payload.outingName);
    setFilteredCategory(null);
    setViewMode('items');
    setSelectedItems([]);
    setSubmitError(null);
    setSearchQuery('');
    navigate('/checkin', { replace: true, state: {} });
  }, [location.state, navigate]);

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

  const categoriesMap = effectiveItems.reduce((acc, item) => {
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

  const filteredItems = effectiveItems.filter(item => {
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

  const changeCheckinOuting = () => {
    setCheckinEvent(null);
    setFilteredOuting(null);
    setFilteredCategory(null);
    setSelectedItems([]);
    setSubmitError(null);
    setSearchQuery('');
  };

  const handleSubmit = () => {
    if (selectedItems.length === 0) {
      setSubmitError('Please select at least one item to check in.');
      return;
    }
    setSubmitError(null);
    setCheckinConfirmOpen(true);
  };

  if (connectionError) {
    return (
      <ConnectionError
        onRetry={() => window.location.reload()}
        onGoHome={() => navigate('/gear')}
      />
    );
  }

  const tabs = [
    { key: 'categories', label: 'Categories' },
    { key: 'items', label: 'Items' },
  ];

  const searchPlaceholder =
    viewMode === 'categories' ? 'Search categories or items...' : 'Search items...';

  const hasDesktopSelection = isDesktop && selectedItems.length > 0;

  /* ── Shared view content (used in both mobile and desktop layouts) ── */

  const viewContent = (
    <>
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
                {effectiveItems.length === 0
                  ? (checkinEvent && !checkinEvent.allEvents
                      ? 'No checked-out gear for this outing'
                      : 'No items are currently checked out')
                  : 'No categories match your search'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Items View */}
      {viewMode === 'items' && (
        <>
          <div className="space-y-3 mb-6">
            {filteredItems.map((item) => {
              const isSelected = selectedItems.find(i => i.itemId === item.itemId);
              return (
                <div
                  key={item.itemId}
                  onClick={() => handleItemSelect(item)}
                  className={`card card-compact cursor-pointer transition-all duration-200 flex flex-row gap-3 items-start sm:items-center ${
                    isSelected ? 'card-selected' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-0.5">
                      {item.itemId}
                    </h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-xs text-gray-700 mt-1">
                      Checked out to: {item.checkedOutTo}
                    </p>
                    {item.outingName && (
                      <p className="text-xs text-gray-500 mt-0.5">Event: {item.outingName}</p>
                    )}
                  </div>
                  <div
                    className="shrink-0 flex w-[7.25rem] flex-col gap-1 sm:w-36"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="text-xs font-medium text-gray-600" htmlFor={`condition-${item.itemId}`}>
                      Condition
                    </label>
                    <select
                      id={`condition-${item.itemId}`}
                      value={isSelected ? isSelected.condition : 'Usable'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleConditionChange(item.itemId, e.target.value);
                      }}
                      className="form-input w-full rounded-lg border border-gray-300 bg-white text-gray-800 text-sm py-2 px-2"
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
                {effectiveItems.length === 0
                  ? (checkinEvent && !checkinEvent.allEvents
                      ? 'No checked-out gear for this outing'
                      : 'No items are currently checked out')
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
    </>
  );

  /* ── Desktop selected-items sidebar panel ── */

  const desktopSelectedPanel = (
    <div className="py-5 pr-5">
      <div className="sticky top-0">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 text-base mb-4">
            Selected ({selectedItems.length})
          </h3>
          <div className="space-y-3 max-h-[calc(100vh-18rem)] overflow-y-auto">
            {selectedItems.map(item => (
              <div
                key={item.itemId}
                className="flex flex-row gap-3 items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{item.itemId}</span>
                    <button
                      type="button"
                      onClick={() => handleItemSelect(item)}
                      className="text-gray-400 hover:text-scout-red text-xs shrink-0 touch-target"
                      aria-label={`Remove ${item.itemId}`}
                    >
                      ✕
                    </button>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                  )}
                </div>
                <div className="shrink-0 w-[7.25rem]">
                  <label className="sr-only" htmlFor={`sidebar-condition-${item.itemId}`}>
                    Condition for {item.itemId}
                  </label>
                  <select
                    id={`sidebar-condition-${item.itemId}`}
                    value={item.condition}
                    onChange={(e) => handleConditionChange(item.itemId, e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-md bg-white py-1.5 px-2"
                  >
                    <option value="Usable">Usable</option>
                    <option value="Not usable">Not usable</option>
                    <option value="Missing">Missing</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
              <p className="text-red-800 text-sm">{submitError}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedItems.length === 0}
            className="w-full h-12 mt-4 rounded-md bg-scout-green text-white text-base font-medium disabled:opacity-50"
          >
            Check in
          </button>
        </div>
      </div>
    </div>
  );

  const checkinKindText =
    checkinEvent && !checkinEvent.allEvents ? eventKindLabel(checkinEvent.eventType) : '';

  return (
    <div className={isDesktop ? 'flex flex-col bg-gray-100 flex-1 min-h-0' : 'h-screen-small flex flex-col bg-gray-100'}>
      {/* Header — mobile only */}
      {!isDesktop && (
        <div className="header">
          <Link to="/gear" className="back-button no-underline">←</Link>
          <h1>Check In Gear</h1>
          <HeaderProfileMenu />
        </div>
      )}

      <AnimateMain className="flex flex-1 flex-col min-h-0">
      <SearchableSegmentedToolbar
        tabs={tabs}
        segmentValue={viewMode}
        onSegmentChange={(key) => {
          setViewMode(key);
          setSearchQuery('');
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchPlaceholder={searchPlaceholder}
      />

      {/* Selected scope: one event or all events */}
      {checkinEvent && (
        <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-2 flex items-center justify-between gap-2">
          <p
            className={`min-w-0 flex-1 truncate text-center text-gray-900 sm:text-left ${
              checkinEvent.allEvents ? 'text-sm font-semibold' : 'text-base'
            }`}
            title={
              checkinEvent.allEvents
                ? 'All events'
                : `${checkinKindText}: ${checkinEvent.outingName}`
            }
          >
            {checkinEvent.allEvents ? (
              'All events'
            ) : (
              <>
                <span className="font-semibold text-gray-600">{checkinKindText}:</span>{' '}
                <span className="font-semibold">{checkinEvent.outingName}</span>
              </>
            )}
          </p>
          <button
            type="button"
            onClick={changeCheckinOuting}
            className="text-scout-blue text-xs font-medium hover:underline touch-target shrink-0"
          >
            Change
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
        ) : hasDesktopSelection ? (
          <div className="grid grid-cols-[1fr_20rem] gap-6">
            <SegmentSwitchAnimate key={viewMode} className="min-h-0">
              <div className="px-5 py-5">
                {viewContent}
              </div>
            </SegmentSwitchAnimate>
            {desktopSelectedPanel}
          </div>
        ) : (
          <SegmentSwitchAnimate key={viewMode} className="min-h-0">
          <div className={`px-5 py-5 ${isDesktop ? '' : 'pb-20'}`}>
            {viewContent}
          </div>
          </SegmentSwitchAnimate>
        )}
      </div>

      {/* Bottom action bar — mobile only */}
      {!isDesktop && (
        <div className="bg-white border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedItems.length === 0}
            className={`w-full h-12 text-base font-medium rounded-xl flex items-center justify-center transition-all shadow-xs disabled:opacity-50 ${
              selectedItems.length > 0
                ? 'bg-scout-green text-white'
                : 'bg-gray-200 text-gray-400 border border-gray-200'
            }`}
          >
            {selectedItems.length === 0
              ? 'Check in'
              : `Check in (${selectedItems.length})`}
          </button>
        </div>
      )}
      </AnimateMain>

      <CheckinOutingModal
        open={!checkinEvent}
        onDismiss={() => navigate('/gear')}
        dismissButtonLabel="Cancel"
        onConfirm={(payload) => {
          setCheckinEvent(payload.allEvents ? { allEvents: true } : payload);
          setFilteredOuting(payload.allEvents ? null : payload.outingName);
          setFilteredCategory(null);
          setViewMode('items');
          setSelectedItems([]);
          setSubmitError(null);
          setSearchQuery('');
        }}
      />
      <CartCheckinModal
        open={checkinConfirmOpen}
        onClose={() => setCheckinConfirmOpen(false)}
        selectedItems={selectedItems}
      />
    </div>
  );
};

export default Checkin;
