import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, PackageCheck, ClipboardList, Loader2 } from 'lucide-react';
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
  const { currentImage, imageData } = useOptimizedImage(selectedImagePath);

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
          backgroundImage: currentImage
            ? `url(${currentImage})`
            : 'linear-gradient(to bottom, #1E398A, #0f1f5c)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1E398A'
        }}
      >
        {/* Troop 222 logo — bottom-left identity mark */}
        <img
          src="/Troop%20222%20Logo.webp"
          alt="Troop 222"
          className="absolute bottom-5 left-4 h-14 w-auto opacity-90 drop-shadow-md"
        />

        {/* Gradient bleed — hero fades into the button panel below */}
        <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-b from-transparent to-white"></div>
      </div>

      {/* Bottom action bar — thumb-reachable */}
      <div className="shrink-0 bg-white px-5 pt-2 pb-7 space-y-3">
        {/* Primary: Check Out — largest */}
        <button
          onClick={handleCheckoutClick}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-full text-xl font-bold py-5 touch-target bg-scout-blue text-white transition-all disabled:opacity-50 shadow-sm"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Package className="h-5 w-5" />}
          Check Out Gear
        </button>

        {/* Secondary: Check In — slightly smaller */}
        <button
          onClick={handleCheckinClick}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-full text-lg font-semibold py-4 touch-target bg-scout-green text-white transition-all disabled:opacity-50 shadow-sm"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackageCheck className="h-5 w-5" />}
          Check In Gear
        </button>

        {/* Tertiary: Manage Inventory — outlined, clearly subordinate */}
        <button
          onClick={() => navigate('/manage-inventory')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-full text-sm font-medium py-3 touch-target border-2 border-scout-red text-scout-red bg-transparent transition-all disabled:opacity-50"
        >
          <ClipboardList className="h-4 w-4" />
          Manage Inventory
        </button>
      </div>
      </div>
    </>
  );
};

export default Landing;
