import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { useSync } from '../context/SyncContext';
import ConnectionError from '../components/ConnectionError';
import ImagePreloader from '../components/ImagePreloader';
import { getRandomHomeImage } from '../utils/imageRotation';
import { useOptimizedImage } from '../hooks/useOptimizedImage';

const Landing = () => {
  const navigate = useNavigate();
  const { checkHealth, loading } = useInventory();
  const { resetSync, markSynced } = useSync();
  const [connectionError, setConnectionError] = useState(false);
  const [retryError, setRetryError] = useState(null);
  
  // Get the random background image once and keep it stable
  const [selectedImagePath] = useState(() => getRandomHomeImage());
  const { currentImage, imageData, isLoading: imageLoading, error: imageError } = useOptimizedImage(selectedImagePath);

  const handleCheckoutClick = async (e) => {
    e.preventDefault();
    setRetryError(null);
    
    try {
      const healthData = await checkHealth();
      if (healthData.googleSheets === 'connected') {
        resetSync(); // Reset sync state for new checkout session
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
    <>
      {/* Preload only the selected hero image's LQIP for instant feedback */}
      {imageData && <ImagePreloader images={[imageData]} />}
      
      <div 
        className="h-screen-small flex flex-col bg-gray-100 relative overflow-hidden"
        style={{
          backgroundImage: currentImage ? `url(${currentImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          // Show a subtle loading state while image loads
          backgroundColor: imageLoading ? '#f3f4f6' : undefined
        }}
      >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      
      {/* Header */}
      <div className="relative z-10 bg-scout-blue text-white py-5 px-4">
        <div className="flex items-center justify-center">
          <img 
            src="/BSA_Logo.webp" 
            alt="BSA Logo" 
            className="h-10 w-auto mr-4"
          />
          <h1 className="text-xl font-semibold text-center">Troop 222 Gear Tracker</h1>
          <img 
            src="/BSA_Logo.webp" 
            alt="BSA Logo" 
            className="h-10 w-auto ml-4"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-8 relative z-10 flex flex-col justify-center flex-1">
        <div className="space-y-6">
          <button
            onClick={handleCheckoutClick}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-full p-6 text-center text-lg touch-target bg-scout-blue text-white shadow-xs hover:bg-scout-blue relative no-underline"
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
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] w-full p-6 text-center text-lg touch-target bg-scout-green text-white shadow-xs hover:bg-green-700 relative no-underline"
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

          <button
            onClick={() => navigate('/manage-inventory')}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] w-full p-6 text-center text-lg touch-target bg-scout-red text-white shadow-xs hover:bg-red-700 relative no-underline"
          >
            <span className="flex items-center justify-center">
              ⚙️ Manage Inventory
            </span>
          </button>
        </div>
      </div>
      </div>
    </>
  );
};

export default Landing;
