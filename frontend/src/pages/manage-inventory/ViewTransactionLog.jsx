import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Toast from '../../components/Toast';
import TransactionCard from '../../components/TransactionCard';
import { useToast } from '../../hooks/useToast';
import { useInventory } from '../../hooks/useInventory';

const ViewTransactionLog = () => {
  const { toast, showToast, hideToast } = useToast();
  const { getData } = useInventory();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [outings, setOutings] = useState([]);
  const [outingBreakdown, setOutingBreakdown] = useState(null);
  
  // Filter state
  const [dateRange, setDateRange] = useState('30'); // Default to 30 days
  const [selectedOuting, setSelectedOuting] = useState('');
  const [itemIdSearch, setItemIdSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [filteredItemIds, setFilteredItemIds] = useState([]); // For outing item breakdown filtering
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unfilteredCount, setUnfilteredCount] = useState(0); // Total for outing without item filter
  const itemsPerPage = 50;

  // Fetch outings for filter dropdown on mount
  useEffect(() => {
    fetchOutings();
  }, []);

  // Debounce item ID search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(itemIdSearch);
      // Clear filtered item IDs when user types in search
      if (itemIdSearch) {
        setFilteredItemIds([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [itemIdSearch]);

  // Clear filtered item IDs when outing changes
  useEffect(() => {
    setFilteredItemIds([]);
  }, [selectedOuting]);

  // Fetch transactions when filters or pagination change
  useEffect(() => {
    fetchTransactions();
  }, [dateRange, selectedOuting, searchDebounce, currentPage, filteredItemIds]);

  // Fetch outing breakdown when an outing is selected
  useEffect(() => {
    if (selectedOuting) {
      fetchOutingBreakdown();
    } else {
      setOutingBreakdown(null);
    }
  }, [selectedOuting]);

  const fetchOutings = async () => {
    try {
      // Always fetch all outings from transaction log (past and present), sorted by most recent first
      const data = await getData('/manage-inventory/all-outings');
      setOutings(data);
    } catch (error) {
      console.error('Error fetching outings:', error);
      // Non-critical error, don't show toast
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      
      const params = new URLSearchParams({
        dateRange,
        limit: itemsPerPage.toString(),
        offset: offset.toString()
      });
      
      if (selectedOuting) {
        params.append('outing', selectedOuting);
      }
      
      // Use filteredItemIds if set, otherwise use search
      if (filteredItemIds.length > 0) {
        params.append('itemId', filteredItemIds.join(','));
      } else if (searchDebounce) {
        params.append('itemId', searchDebounce);
      }
      
      const data = await getData(`/manage-inventory/transactions?${params.toString()}`);
      setTransactions(data.transactions);
      setTotalCount(data.total);
      
      // If filtering by item IDs, fetch unfiltered count for "show all" display
      if (filteredItemIds.length > 0 && selectedOuting) {
        const unfilteredParams = new URLSearchParams({
          dateRange,
          limit: '1',
          offset: '0',
          outing: selectedOuting
        });
        const unfilteredData = await getData(`/manage-inventory/transactions?${unfilteredParams.toString()}`);
        setUnfilteredCount(unfilteredData.total);
      } else {
        setUnfilteredCount(0);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showToast('Failed to load transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutingBreakdown = async () => {
    try {
      const data = await getData(`/manage-inventory/outing-breakdown/${encodeURIComponent(selectedOuting)}`);
      setOutingBreakdown(data);
    } catch (error) {
      console.error('Error fetching outing breakdown:', error);
      // Non-critical error, don't show toast
      setOutingBreakdown(null);
    }
  };

  const handleFilterByCheckedOut = () => {
    if (outingBreakdown && outingBreakdown.checkedOutItems.length > 0) {
      setFilteredItemIds(outingBreakdown.checkedOutItems);
      setItemIdSearch(''); // Clear text search
      setCurrentPage(1);
    }
  };

  const handleFilterByCheckedIn = () => {
    if (outingBreakdown && outingBreakdown.checkedInItems.length > 0) {
      setFilteredItemIds(outingBreakdown.checkedInItems);
      setItemIdSearch(''); // Clear text search
      setCurrentPage(1);
    }
  };

  const handleShowAllOutingTransactions = () => {
    setFilteredItemIds([]);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Header */}
      <div className="header">
        <Link
          to="/manage-inventory"
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1>Transaction Log</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Filters Section */}
      <div className="bg-white px-5 py-4 border-b border-gray-200 sticky top-16 z-40 space-y-3">
        {/* Row 1: Date Range and Outing side by side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-scout-blue min-h-[56px]"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          {/* Outing Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outing
            </label>
            <select
              value={selectedOuting}
              onChange={(e) => {
                setSelectedOuting(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-scout-blue min-h-[56px]"
            >
              <option value="">All outings</option>
              {outings.map((outing) => (
                <option key={outing.outingName} value={outing.outingName}>
                  {outing.outingName} ({outing.transactionCount} {outing.transactionCount === 1 ? 'transaction' : 'transactions'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Search Item ID - full width */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Item ID
          </label>
          <input
            type="text"
            value={itemIdSearch}
            onChange={(e) => {
              setItemIdSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="e.g., TENT-001"
            className="search-input"
          />
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {startItem}-{endItem} of {totalCount} {totalCount === 1 ? 'transaction' : 'transactions'}
            {unfilteredCount > 0 && unfilteredCount > totalCount && (
              <>
                {' '}
                <button
                  onClick={handleShowAllOutingTransactions}
                  className="text-scout-blue hover:underline font-medium"
                >
                  (show all {unfilteredCount})
                </button>
              </>
            )}
          </p>
          {selectedOuting && outingBreakdown && (
            <div className="mt-2 pt-2 border-t border-gray-300">
              <p className="text-sm font-medium text-gray-700">
                {outingBreakdown.outingName} - {outingBreakdown.totalUniqueItems} unique {outingBreakdown.totalUniqueItems === 1 ? 'item' : 'items'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                <button
                  onClick={handleFilterByCheckedOut}
                  className="text-scout-blue font-medium hover:underline cursor-pointer"
                  disabled={outingBreakdown.checkedOut === 0}
                >
                  {outingBreakdown.checkedOut} checked out
                </button>
                {' • '}
                <button
                  onClick={handleFilterByCheckedIn}
                  className="text-scout-green font-medium hover:underline cursor-pointer"
                  disabled={outingBreakdown.checkedIn === 0}
                >
                  {outingBreakdown.checkedIn} checked in
                </button>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-5 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-scout-blue"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500 text-lg">No transactions found</p>
            <p className="text-gray-400 text-sm mt-2">
              Try adjusting your filters to see more results
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction, index) => (
              <TransactionCard 
                key={index} 
                transaction={transaction} 
                showItemId={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="px-5 py-6 bg-white border-t border-gray-200 sticky bottom-0">
          <div className="flex items-center justify-between gap-4">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-4 bg-scout-blue text-white rounded-lg hover:bg-scout-blue/90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px] flex-1 font-medium text-base"
            >
              Previous
            </button>

            {/* Page Indicator */}
            <div className="text-sm text-gray-600 whitespace-nowrap px-4">
              Page {currentPage} of {totalPages}
            </div>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-4 bg-scout-blue text-white rounded-lg hover:bg-scout-blue/90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px] flex-1 font-medium text-base"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewTransactionLog;

