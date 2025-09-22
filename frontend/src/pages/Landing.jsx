import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { useSync } from '../context/SyncContext';
import ConnectionError from '../components/ConnectionError';

const Landing = () => {
  const navigate = useNavigate();
  const { checkHealth, loading } = useInventory();
  const { resetSync, markSynced } = useSync();
  const [connectionError, setConnectionError] = useState(false);
  const [retryError, setRetryError] = useState(null);

  const handleCheckoutClick = async (e) => {
    e.preventDefault();
    setRetryError(null);
    
    try {
      const healthData = await checkHealth();
      if (healthData.googleSheets === 'connected') {
        resetSync(); // Reset sync state for new checkout session
        markSynced('checkout'); // Mark that we're starting a checkout session
        navigate('/categories?sync=true');
      } else {
        setConnectionError(true);
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionError(true);
    }
  };

  const handleCheckinClick = async (e) => {
    e.preventDefault();
    setRetryError(null);
    
    try {
      const healthData = await checkHealth();
      if (healthData.googleSheets === 'connected') {
        resetSync(); // Reset sync state for new checkin session
        markSynced('checkin'); // Mark that we're starting a checkin session
        navigate('/checkin/outings');
      } else {
        setConnectionError(true);
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionError(true);
    }
  };

  const handleRetry = () => {
    setConnectionError(false);
    setRetryError(null);
  };

  const handleGoHome = () => {
    setConnectionError(false);
    setRetryError(null);
  };

  if (connectionError) {
    return <ConnectionError onRetry={handleRetry} onGoHome={handleGoHome} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <h1>Scout Gear Checkout</h1>
      </div>

      {/* Content */}
      <div className="px-5 py-8">
        <div className="space-y-8">
          <button
            onClick={handleCheckoutClick}
            disabled={loading}
            className="block w-full btn-primary p-6 text-center text-lg touch-target disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            <span className="flex items-center justify-center">
              📦 Check Out Gear
              {loading && (
                <div className="ml-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                </div>
              )}
            </span>
          </button>

          <button
            onClick={handleCheckinClick}
            disabled={loading}
            className="block w-full btn-success p-6 text-center text-lg touch-target disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            <span className="flex items-center justify-center">
              ✅ Check In Gear
              {loading && (
                <div className="ml-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                </div>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
