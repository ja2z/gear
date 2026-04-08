import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import ConnectionError from '../components/ConnectionError';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';

const OutingSelection = () => {
  const { getData } = useInventory();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  useDesktopHeader({ title: 'Select Outing' });
  const [searchTerm, setSearchTerm] = useState('');
  const [outingsWithItems, setOutingsWithItems] = useState([]);
  const [error, setError] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOutings = async () => {
      try {
        setError(null);
        setConnectionError(false);
        setIsLoading(true);
        const data = await getData('/inventory/outings');
        setOutingsWithItems(data);
      } catch (err) {
        console.error('Error fetching outings:', err);
        setConnectionError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutings();
  }, []);

  const filteredOutings = outingsWithItems.filter(outing =>
    outing.outingName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOutingSelect = (outingName) => {
    navigate(`/checkin/items?outing=${encodeURIComponent(outingName)}`);
  };

  const handleRetry = () => {
    setConnectionError(false);
    // Trigger a re-fetch by updating the dependency
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/gear');
  };

  if (connectionError) {
    return <ConnectionError onRetry={handleRetry} onGoHome={handleGoHome} />;
  }

  return (
    <div className={isDesktop ? 'flex flex-col flex-1 min-h-0 bg-gray-100' : 'h-screen-small flex flex-col bg-gray-100'}>
      {!isDesktop && (
        <div className="header">
          <Link
            to="/gear"
            className="back-button no-underline"
          >
            ←
          </Link>
          <h1>Select Outing</h1>
          <HeaderProfileMenu />
        </div>
      )}

      <AnimateMain className="flex flex-1 flex-col min-h-0">
      {/* Search */}
      <div className="bg-white px-5 py-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search outings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">

      {/* Error Display */}
      {error && (
        <div className="px-5 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="px-5 py-12">
          <div className="text-center">
            <p className="text-gray-500">Loading outings...</p>
          </div>
        </div>
      )}

      {/* Outings List */}
      {!isLoading && !error && (
        <div className="px-5 py-5">
          <div className="space-y-3">
            {filteredOutings.map((outing) => (
              <div
                key={outing.outingName}
                className="card card-compact cursor-pointer hover:shadow-card-hover transition-all"
                onClick={() => handleOutingSelect(outing.outingName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 m-0">
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

          {filteredOutings.length === 0 && outingsWithItems.length > 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No outings found matching your search</p>
            </div>
          )}

          {outingsWithItems.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-gray-500">No items are currently checked out</p>
              <Link
                to="/gear"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive mt-4 px-6 py-3 bg-scout-blue/12 border border-scout-blue/20 text-scout-blue shadow-xs hover:bg-scout-blue/18 rounded-lg no-underline"
              >
                Back to Home
              </Link>
            </div>
          )}
        </div>
      )}

      </div>{/* end scrollable content */}
      </AnimateMain>
    </div>
  );
};

export default OutingSelection;
