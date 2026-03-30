import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, LogIn, BookMarked, ClipboardList, Loader2 } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { useCart } from '../context/CartContext';
import ConnectionError from '../components/ConnectionError';
import SlowLoadHint from '../components/SlowLoadHint';
import { useSlowLoad } from '../hooks/useSlowLoad';
import ImagePreloader from '../components/ImagePreloader';
import { getRandomHomeImage } from '../utils/imageRotation';
import { useOptimizedImage } from '../hooks/useOptimizedImage';

const Landing = () => {
  const navigate = useNavigate();
  const { checkHealth } = useInventory();
  const { clearCart, reservationMeta } = useCart();
  const [connectionError, setConnectionError] = useState(false);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);

  // Get the random background image once and keep it stable
  const [selectedImagePath] = useState(() => getRandomHomeImage());
  const { currentImage, imageData } = useOptimizedImage(selectedImagePath);

  const withHealthCheck = (setLoading, onSuccess) => async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const healthData = await checkHealth();
      if (healthData.supabase === 'connected') {
        onSuccess();
      } else {
        setConnectionError(true);
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutClick = withHealthCheck(setCheckoutLoading, () => {
    if (reservationMeta) clearCart();
    navigate('/categories');
  });
  const handleCheckinClick = withHealthCheck(setCheckinLoading, () => navigate('/checkin/outings'));

  const handleRetry = () => setConnectionError(false);
  const handleGoHome = () => setConnectionError(false);

  if (connectionError) {
    return <ConnectionError onRetry={handleRetry} onGoHome={handleGoHome} />;
  }

  const anyLoading = checkoutLoading || checkinLoading;
  const slowHint = useSlowLoad(anyLoading);

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
        {/* Gradient bleed — hero fades into the button panel below */}
        <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-b from-transparent to-white"></div>
      </div>

      {/* Bottom action bar — 2×2 grid */}
      <div className="shrink-0 bg-white px-5 pt-2 pb-7 space-y-3">
        {/* Row 1: Check Out + Check In */}
        <div className="flex gap-3">
          <button
            onClick={handleCheckoutClick}
            disabled={anyLoading}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 touch-target bg-scout-blue text-white transition-all disabled:opacity-50 shadow-sm"
          >
            {checkoutLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <LogOut className="h-6 w-6" />}
            <span className="text-base font-bold">Check Out</span>
          </button>

          <button
            onClick={handleCheckinClick}
            disabled={anyLoading}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 touch-target bg-scout-green text-white transition-all disabled:opacity-50 shadow-sm"
          >
            {checkinLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <LogIn className="h-6 w-6" />}
            <span className="text-base font-bold">Check In</span>
          </button>
        </div>

        {/* Row 2: Reservations + Manage Inventory */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/reservations')}
            disabled={anyLoading}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 touch-target bg-scout-orange text-white transition-all disabled:opacity-50 shadow-sm"
          >
            <BookMarked className="h-6 w-6" />
            <span className="text-base font-bold">Reservations</span>
          </button>

          <button
            onClick={() => navigate('/manage-inventory')}
            disabled={anyLoading}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 touch-target border-2 border-scout-red text-scout-red bg-transparent transition-all disabled:opacity-50"
          >
            <ClipboardList className="h-6 w-6" />
            <span className="text-base font-bold">Manage</span>
          </button>
        </div>
        <SlowLoadHint hint={slowHint} />
      </div>
      </div>
    </>
  );
};

export default Landing;
