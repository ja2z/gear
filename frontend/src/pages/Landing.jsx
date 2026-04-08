import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LogIn, BookMarked, Loader2 } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { canCheckout, canCheckin } from '../utils/permissions';
import ConnectionError from '../components/ConnectionError';
import SlowLoadHint from '../components/SlowLoadHint';
import { useSlowLoad } from '../hooks/useSlowLoad';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';

const tileBase =
  'flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-3xl px-3 py-3 text-gray-900 shadow-sm touch-target transition-colors disabled:opacity-50';

const Landing = () => {
  const navigate = useNavigate();
  const { checkHealth } = useInventory();
  const { clearCart, reservationMeta } = useCart();
  const { user } = useAuth();
  const userCanCheckout = canCheckout(user);
  const userCanCheckin = canCheckin(user);
  const [connectionError, setConnectionError] = useState(false);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);

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
  const handleCheckinClick = withHealthCheck(setCheckinLoading, () => navigate('/checkin'));

  const handleRetry = () => setConnectionError(false);
  const handleGoHome = () => setConnectionError(false);

  if (connectionError) {
    return <ConnectionError onRetry={handleRetry} onGoHome={handleGoHome} />;
  }

  const anyLoading = checkoutLoading || checkinLoading;
  const slowHint = useSlowLoad(anyLoading);

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <div className="header relative z-10 shrink-0">
        <Link to="/home" className="back-button no-underline" aria-label="Back to troop hub">
          ←
        </Link>
        <div className="min-w-0 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Gear</p>
          <h1 className="text-truncate text-base font-semibold">Checkout and inventory</h1>
        </div>
        <HeaderProfileMenu />
      </div>

      <AnimateMain className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-4 pb-8">
        <p className="shrink-0 text-center text-sm text-gray-600">
          What do you want to do?
        </p>

        <div className="grid shrink-0 grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCheckoutClick}
            disabled={anyLoading || !userCanCheckout}
            title={!userCanCheckout ? 'Requires QM or Admin role' : undefined}
            className={`${tileBase} border border-scout-blue/15 bg-scout-blue/8 hover:bg-scout-blue/12 active:bg-scout-blue/15`}
          >
            {checkoutLoading ? (
              <Loader2 className="h-6 w-6 shrink-0 animate-spin text-scout-blue/70" />
            ) : (
              <LogOut className="h-6 w-6 shrink-0 text-scout-blue/70" />
            )}
            <span className="text-base font-bold">Check Out</span>
            <span className="text-center text-[11px] font-normal leading-snug text-gray-500">
              Take gear for an outing or trip
            </span>
          </button>

          <button
            type="button"
            onClick={handleCheckinClick}
            disabled={anyLoading || !userCanCheckin}
            title={!userCanCheckin ? 'Requires QM or Admin role' : undefined}
            className={`${tileBase} border border-scout-green/15 bg-scout-green/8 hover:bg-scout-green/12 active:bg-scout-green/15`}
          >
            {checkinLoading ? (
              <Loader2 className="h-6 w-6 shrink-0 animate-spin text-scout-green/70" />
            ) : (
              <LogIn className="h-6 w-6 shrink-0 text-scout-green/70" />
            )}
            <span className="text-base font-bold">Check In</span>
            <span className="text-center text-[11px] font-normal leading-snug text-gray-500">
              Return gear to the shed
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/reservations')}
            disabled={anyLoading}
            className={`${tileBase} col-span-2 border border-scout-orange/15 bg-scout-orange/8 hover:bg-scout-orange/12 active:bg-scout-orange/15`}
          >
            <BookMarked className="h-6 w-6 shrink-0 text-scout-orange/70" />
            <span className="text-base font-bold">Reservations</span>
            <span className="text-center text-[11px] font-normal leading-snug text-gray-500">
              Hold gear for a future outing
            </span>
          </button>
        </div>

        <SlowLoadHint hint={slowHint} />
      </AnimateMain>
    </div>
  );
};

export default Landing;
