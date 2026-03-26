import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import ConnectionError from '../components/ConnectionError';
import ImagePreloader from '../components/ImagePreloader';
import { getRandomHomeImage } from '../utils/imageRotation';
import { useOptimizedImage } from '../hooks/useOptimizedImage';

const Landing = () => {
  const navigate = useNavigate();
  const { checkHealth, loading } = useInventory();
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
      if (healthData.supabase === 'connected') {
        navigate('/categories');
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
      if (healthData.supabase === 'connected') {
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

      <div className="h-screen-small flex flex-col bg-gray-100">
      {/* Header */}
      <div className="relative z-10 bg-scout-blue text-white py-5 px-4 shrink-0">
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

      {/* Hero image — fills remaining space above bottom bar */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{
          backgroundImage: currentImage ? `url(${currentImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: imageLoading ? '#f3f4f6' : '#1E398A'
        }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Bottom action bar — thumb-reachable */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 pt-4 pb-6 space-y-3">
        <button
          onClick={handleCheckoutClick}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl text-lg font-semibold py-4 touch-target bg-scout-blue text-white transition-all disabled:opacity-50"
        >
          📦 Check Out Gear
          {loading && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-1"></div>
          )}
        </button>

        <button
          onClick={handleCheckinClick}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl text-lg font-semibold py-4 touch-target bg-scout-green text-white transition-all disabled:opacity-50"
        >
          ✅ Check In Gear
          {loading && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-1"></div>
          )}
        </button>

        <button
          onClick={() => navigate('/manage-inventory')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl text-lg font-semibold py-4 touch-target bg-scout-red text-white transition-all disabled:opacity-50"
        >
          ⚙️ Manage Inventory
        </button>
      </div>
      </div>
    </>
  );
};

export default Landing;
