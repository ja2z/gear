import { useState } from 'react';
import { useInventory } from '../hooks/useInventory';

const ConnectionError = ({ onRetry, onGoHome, detail }) => {
  const { checkHealth, loading } = useInventory();
  const [retryError, setRetryError] = useState(null);

  const handleRetry = async () => {
    setRetryError(null);
    try {
      const healthData = await checkHealth();
      if (healthData.supabase === 'connected') {
        onRetry();
      } else {
        setRetryError('Database is still not accessible');
      }
    } catch (error) {
      setRetryError(error.message);
    }
  };

  return (
    <div className="h-screen-small overflow-y-auto overscroll-contain bg-gray-100">
      <div className="flex min-h-full min-w-0 flex-col items-center justify-center px-5 py-8">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full shrink-0 text-center">
        {/* Error Icon */}
        <div className="text-6xl mb-6">❌</div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Cannot Connect to Database
        </h1>

        {/* Error Description */}
        <p className="text-gray-600 mb-6">
          The gear management system requires a connection to the database to function properly.
        </p>

        {detail && (
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-left">
            <p className="text-xs font-semibold text-amber-900 mb-1">Details</p>
            <p className="text-xs text-amber-900/90 break-words font-mono">{detail}</p>
            {import.meta.env.DEV &&
              /failed to fetch|load failed|network|not allowed to request resource/i.test(detail) && (
                <p className="text-xs text-amber-800/90 mt-2 leading-snug">
                  Dev tip: Use the exact same URL in Safari as in Chrome (e.g. both{' '}
                  <code className="rounded bg-amber-100/80 px-1">localhost</code> or both{' '}
                  <code className="rounded bg-amber-100/80 px-1">127.0.0.1</code>). Ensure the Vite and
                  backend servers are running.
                </p>
              )}
          </div>
        )}

        {/* Possible Causes */}
        <div className="text-left mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Possible causes:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Internet connection issues</li>
            <li>• Database service unavailable</li>
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
            className="w-full bg-scout-blue/12 border border-scout-blue/20 text-scout-blue px-6 py-3 rounded-lg hover:bg-scout-blue/18 transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed no-underline"
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
    </div>
  );
};

export default ConnectionError;
