import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LogIn, BookMarked, Loader2, Package } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { canCheckout, canCheckin } from '../utils/permissions';
import ConnectionError from '../components/ConnectionError';
import SlowLoadHint from '../components/SlowLoadHint';
import { useSlowLoad } from '../hooks/useSlowLoad';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';

const tileBase =
  'flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-3xl px-3 py-3 text-gray-900 shadow-sm touch-target transition-colors disabled:opacity-50';

function useGearStats() {
  const { getData } = useInventory();
  const [stats, setStats] = useState(null);
  const [outings, setOutings] = useState([]);

  const load = useCallback(async () => {
    try {
      const [inv, outData] = await Promise.all([
        getData('/inventory').catch(() => []),
        getData('/inventory/outings').catch(() => []),
      ]);
      const active = inv.filter((i) => i.status !== 'Removed from inventory');
      setStats({
        total: active.length,
        inShed: active.filter((i) => i.status === 'In shed').length,
        checkedOut: active.filter((i) => i.status === 'Checked out').length,
        reserved: active.filter((i) => i.status === 'Reserved').length,
      });
      setOutings(outData.slice(0, 5));
    } catch {
      // non-blocking
    }
  }, [getData]);

  useEffect(() => { load(); }, [load]);
  return { stats, outings };
}

const STAT_ITEMS = [
  { key: 'inShed', label: 'In Shed', color: 'text-scout-green', bg: 'bg-scout-green/10' },
  { key: 'checkedOut', label: 'Checked Out', color: 'text-scout-red', bg: 'bg-scout-red/10' },
  { key: 'reserved', label: 'Reserved', color: 'text-scout-orange', bg: 'bg-scout-orange/10' },
  { key: 'total', label: 'Total Active', color: 'text-gray-700', bg: 'bg-gray-100' },
];

const Landing = () => {
  const navigate = useNavigate();
  const { checkHealth } = useInventory();
  const { clearCart, reservationMeta } = useCart();
  const { user } = useAuth();
  const userCanCheckout = canCheckout(user);
  const userCanCheckin = canCheckin(user);
  const [connectionError, setConnectionError] = useState(false);
  const [connectionErrorDetail, setConnectionErrorDetail] = useState(null);
  const isDesktop = useIsDesktop();
  const { stats, outings } = useGearStats();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);

  useDesktopHeader({ title: 'Gear', subtitle: 'Checkout & inventory' });

  const withHealthCheck = (setLoading, onSuccess) => async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const healthData = await checkHealth();
      if (healthData.supabase === 'connected') {
        onSuccess();
      } else {
        setConnectionErrorDetail(
          healthData?.message || 'Server did not report database as connected.'
        );
        setConnectionError(true);
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionErrorDetail(error?.message || 'Unknown error');
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

  const handleRetry = () => {
    setConnectionError(false);
    setConnectionErrorDetail(null);
  };
  const handleGoHome = () => {
    setConnectionError(false);
    setConnectionErrorDetail(null);
  };

  if (connectionError) {
    return (
      <ConnectionError
        onRetry={handleRetry}
        onGoHome={handleGoHome}
        detail={connectionErrorDetail}
      />
    );
  }

  const anyLoading = checkoutLoading || checkinLoading;
  const slowHint = useSlowLoad(anyLoading);

  const gearActions = (
    <>
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
        className={`${tileBase} border border-scout-orange/15 bg-scout-orange/8 hover:bg-scout-orange/12 active:bg-scout-orange/15`}
      >
        <BookMarked className="h-6 w-6 shrink-0 text-scout-orange/70" />
        <span className="text-base font-bold">Reservations</span>
        <span className="text-center text-[11px] font-normal leading-snug text-gray-500">
          Hold gear for a future outing
        </span>
      </button>
    </>
  );

  if (isDesktop) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-4 text-sm text-gray-600">What do you want to do?</p>
          <div className="grid max-w-4xl grid-cols-3 gap-4">
            {gearActions}
          </div>
        </div>
        <SlowLoadHint hint={slowHint} />

        {/* At a Glance stats */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-900">At a Glance</h2>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {STAT_ITEMS.map((s) => (
              <div key={s.key} className="flex items-center gap-3 rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                  <Package className={`h-[18px] w-[18px] ${s.color}`} strokeWidth={2} />
                </div>
                <div>
                  <p className={`text-2xl font-bold tabular-nums ${s.color}`}>
                    {stats ? stats[s.key] : '—'}
                  </p>
                  <p className="text-xs font-medium text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Active outings with gear */}
        {outings.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">Active Outings with Gear</h2>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
              {outings.map((o) => (
                <Link
                  key={o.eventId ?? o.outingName}
                  to="/checkin"
                  className="flex items-center justify-between gap-3 px-4 py-3 no-underline transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{o.outingName}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-scout-red/10 px-2.5 py-0.5 text-xs font-semibold text-scout-red">
                    {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

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
          {gearActions}
        </div>
        <SlowLoadHint hint={slowHint} />
      </AnimateMain>
    </div>
  );
};

export default Landing;
