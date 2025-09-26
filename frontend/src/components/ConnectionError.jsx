import { useState } from 'react';
import { useInventory } from '../hooks/useInventory';

const ConnectionError = ({ onRetry, onGoHome }) => {
  const { checkHealth, loading } = useInventory();
  const [retryError, setRetryError] = useState(null);

  const handleRetry = async () => {
    setRetryError(null);
    try {
      const healthData = await checkHealth();
      if (healthData.googleSheets === 'connected') {
        onRetry();
      } else {
        setRetryError('Google Sheets is still not accessible');
      }
    } catch (error) {
      setRetryError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-5">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="text-6xl mb-6">❌</div>
        
        {/* Error Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Cannot Connect to Google Sheets
        </h1>
        
        {/* Error Description */}
        <p className="text-gray-600 mb-6">
          The gear management system requires a connection to Google Sheets to function properly.
        </p>
        
        {/* Possible Causes */}
        <div className="text-left mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Possible causes:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Internet connection issues</li>
            <li>• Google Sheets service unavailable</li>
            <li>• Server configuration problems</li>
          </ul>
        </div>
        
        {/* What to do */}
        <div className="text-left mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">What you can do:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Check your internet connection</li>
            <li>• Try refreshing the page</li>
            <li>• Contact the system administrator</li>
          </ul>
        </div>
        
        {/* Retry Error Message */}
        {retryError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{retryError}</p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            disabled={loading}
            className="w-full bg-scout-blue text-white px-6 py-3 rounded-lg hover:bg-scout-blue transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed no-underline"
          >
            {loading ? 'Testing Connection...' : 'Retry Connection'}
          </button>
          
          <button
            onClick={onGoHome}
            className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors touch-target no-underline"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionError;
