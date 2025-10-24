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
  
  // Filter state
  const [dateRange, setDateRange] = useState('30'); // Default to 30 days
  const [selectedOuting, setSelectedOuting] = useState('');
  const [itemIdSearch, setItemIdSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  // Fetch outings for filter dropdown
  useEffect(() => {
    fetchOutings();
  }, []);

  // Debounce item ID search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(itemIdSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [itemIdSearch]);

  // Fetch transactions when filters or pagination change
  useEffect(() => {
    fetchTransactions();
  }, [dateRange, selectedOuting, searchDebounce, currentPage]);

  const fetchOutings = async () => {
    try {
      const data = await getData('/inventory/outings');
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
      
      if (searchDebounce) {
        params.append('itemId', searchDebounce);
      }
      
      const data = await getData(`/manage-inventory/transactions?${params.toString()}`);
      setTransactions(data.transactions);
      setTotalCount(data.total);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showToast('Failed to load transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setDateRange('30');
    setSelectedOuting('');
    setItemIdSearch('');
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-scout-blue min-h-[44px]"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-scout-blue min-h-[44px]"
          >
            <option value="">All outings</option>
            {outings.map((outing) => (
              <option key={outing.outingName} value={outing.outingName}>
                {outing.outingName} ({outing.itemCount} items)
              </option>
            ))}
          </select>
        </div>

        {/* Item ID Search */}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-scout-blue min-h-[44px]"
          />
        </div>

        {/* Clear Filters Button */}
        <button
          onClick={handleClearFilters}
          className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors min-h-[44px] font-medium"
        >
          Clear Filters
        </button>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {startItem}-{endItem} of {totalCount} transactions
          </p>
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
              className="px-4 py-2 bg-scout-blue text-white rounded-lg hover:bg-scout-blue/90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex-1 font-medium"
            >
              Previous
            </button>

            {/* Page Indicator */}
            <div className="text-sm text-gray-600 whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </div>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-scout-blue text-white rounded-lg hover:bg-scout-blue/90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex-1 font-medium"
            >
              Next
            </button>
          </div>

          {/* Jump to Page (Desktop-friendly) */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <label htmlFor="pageJump" className="text-sm text-gray-600">
              Go to page:
            </label>
            <input
              id="pageJump"
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  handlePageChange(page);
                }
              }}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-scout-blue focus:border-scout-blue"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewTransactionLog;

