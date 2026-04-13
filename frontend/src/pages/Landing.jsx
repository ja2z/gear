import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import CheckoutOutingModal from '../components/CheckoutOutingModal';
import CheckinOutingModal from '../components/CheckinOutingModal';
import ReservationPickerModal from '../components/ReservationPickerModal';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';

/** Horizontal row tiles — same light hue + tinted icons as the legacy gear hub. */
const actionRowBtn =
  'group flex w-full min-h-[4.75rem] flex-row items-center gap-4 rounded-2xl border px-4 py-3.5 text-left text-gray-900 shadow-sm transition-colors active:scale-[0.995] disabled:opacity-50 touch-target sm:min-h-[5rem] sm:rounded-3xl sm:px-5 sm:py-4';
const actionIconWrap = 'flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14';

function useGearStats() {
  const { getData } = useInventory();
  const [stats, setStats] = useState(null);
  const [outings, setOutings] = useState([]);

  const load = useCallback(async () => {
    try {
      const [inv, outData, categories] = await Promise.all([
        getData('/inventory').catch(() => []),
        getData('/inventory/outings').catch(() => []),
        getData('/inventory/categories').catch(() => []),
      ]);
      const active = inv.filter((i) => i.status !== 'Removed from inventory');
      setStats({
        total: active.length,
        itemTypes: Array.isArray(categories) ? categories.length : null,
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

/** Hub hero: three headline numbers (match gear-room style). */
const HUB_STAT_ITEMS = [
  { key: 'itemTypes', label: 'Item types', color: 'text-scout-blue', bg: 'bg-scout-blue/10' },
  { key: 'inShed', label: 'Available', color: 'text-scout-green', bg: 'bg-scout-green/10' },
  { key: 'checkedOut', label: 'Checked out', color: 'text-scout-red', bg: 'bg-scout-red/10' },
];

const DESKTOP_EXTRA_STATS = [
  { key: 'reserved', label: 'Reserved', color: 'text-scout-orange', bg: 'bg-scout-orange/10' },
  { key: 'total', label: 'Total active', color: 'text-gray-700', bg: 'bg-gray-100' },
];

const Landing = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { checkHealth } = useInventory();
  const { clearCart, reservationMeta, setCheckoutEvent } = useCart();
  const { user } = useAuth();
  const userCanCheckout = canCheckout(user);
  const userCanCheckin = canCheckin(user);
  const [connectionError, setConnectionError] = useState(false);
  const [connectionErrorDetail, setConnectionErrorDetail] = useState(null);
  const isDesktop = useIsDesktop();
  const { stats, outings } = useGearStats();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [outingModalOpen, setOutingModalOpen] = useState(false);
  const [checkinOutingModalOpen, setCheckinOutingModalOpen] = useState(false);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);

  /** e.g. Reservations “Create reservation” → /gear?pickReservation=1 */
  useEffect(() => {
    if (searchParams.get('pickReservation') !== '1') return;
    setReservationModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('pickReservation');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
    else setCheckoutEvent(null);
    setOutingModalOpen(true);
  });
  const handleCheckinClick = withHealthCheck(setCheckinLoading, () => setCheckinOutingModalOpen(true));

  const handleReservationsClick = withHealthCheck(setReservationLoading, () => {
    setReservationModalOpen(true);
  });

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

  const anyLoading = checkoutLoading || checkinLoading || reservationLoading;
  const slowHint = useSlowLoad(anyLoading);

  const gearHubHero = (
    <section className="rounded-3xl border border-gray-200/90 bg-white px-5 py-4 shadow-sm sm:py-5">
      <div className="mb-3 flex h-16 items-center justify-center sm:h-[4.5rem]" aria-hidden>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200/90 bg-gray-50 sm:h-16 sm:w-16">
          <Package className="h-8 w-8 text-scout-blue sm:h-9 sm:w-9" strokeWidth={2} />
        </div>
      </div>
      <h2 className="text-center text-[15px] font-bold uppercase tracking-[0.14em] text-scout-blue">
        Gear room
      </h2>
      <p className="mt-1.5 text-center text-[13px] leading-snug text-gray-600 sm:text-sm">
        Check out gear for troop events, return it when you're done, or reserve items ahead of time.
      </p>
    </section>
  );

  const hubStatsStrip = (
    <section className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Inventory snapshot">
      {HUB_STAT_ITEMS.map((s) => (
        <div
          key={s.key}
          className="flex flex-col items-center justify-center rounded-2xl border border-gray-200/90 bg-white px-1.5 py-3 shadow-sm sm:py-4"
        >
          <p className={`text-2xl font-bold tabular-nums sm:text-3xl ${s.color}`}>
            {stats ? stats[s.key] ?? '—' : '—'}
          </p>
          <p className="mt-1 max-w-[6.5rem] text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:max-w-none sm:text-[11px]">
            {s.label}
          </p>
        </div>
      ))}
    </section>
  );

  const gearActionButtons = (
    <>
      <button
        type="button"
        onClick={handleCheckoutClick}
        disabled={anyLoading || !userCanCheckout}
        title={!userCanCheckout ? 'Requires QM or Admin role' : undefined}
        className={`${actionRowBtn} border-scout-blue/25 bg-scout-blue/12 hover:bg-scout-blue/18 active:bg-scout-blue/24`}
      >
        {checkoutLoading ? (
          <div className={actionIconWrap}>
            <Loader2 className="h-6 w-6 animate-spin text-scout-blue/85" />
          </div>
        ) : (
          <div className={actionIconWrap}>
            <LogOut className="h-6 w-6 text-scout-blue/85" strokeWidth={2.25} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="block text-base font-bold leading-tight text-gray-900">Check out</span>
          <span className="mt-1 block text-[11px] font-normal leading-snug text-gray-500 sm:text-[12px]">
            Take gear for an outing or trip
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={handleCheckinClick}
        disabled={anyLoading || !userCanCheckin}
        title={!userCanCheckin ? 'Requires QM or Admin role' : undefined}
        className={`${actionRowBtn} border-scout-green/25 bg-scout-green/12 hover:bg-scout-green/18 active:bg-scout-green/24`}
      >
        {checkinLoading ? (
          <div className={actionIconWrap}>
            <Loader2 className="h-6 w-6 animate-spin text-scout-green/85" />
          </div>
        ) : (
          <div className={actionIconWrap}>
            <LogIn className="h-6 w-6 text-scout-green/85" strokeWidth={2.25} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="block text-base font-bold leading-tight text-gray-900">Check in</span>
          <span className="mt-1 block text-[11px] font-normal leading-snug text-gray-500 sm:text-[12px]">
            Return gear to the shed
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={handleReservationsClick}
        disabled={anyLoading}
        className={`${actionRowBtn} border-scout-orange/25 bg-scout-orange/12 hover:bg-scout-orange/18 active:bg-scout-orange/24`}
      >
        {reservationLoading ? (
          <div className={actionIconWrap}>
            <Loader2 className="h-6 w-6 animate-spin text-scout-orange/85" />
          </div>
        ) : (
          <div className={actionIconWrap}>
            <BookMarked className="h-6 w-6 text-scout-orange/85" strokeWidth={2.25} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="block text-base font-bold leading-tight text-gray-900">Reservations</span>
          <span className="mt-1 block text-[11px] font-normal leading-snug text-gray-500 sm:text-[12px]">
            Hold gear for a future outing
          </span>
        </div>
      </button>
    </>
  );

  const outingModal = (
    <CheckoutOutingModal
      open={outingModalOpen}
      onDismiss={() => setOutingModalOpen(false)}
      onContinueSuccess={() => {
        setOutingModalOpen(false);
        navigate('/categories');
      }}
      dismissButtonLabel="Cancel"
    />
  );

  const checkinOutingModal = (
    <CheckinOutingModal
      open={checkinOutingModalOpen}
      onDismiss={() => setCheckinOutingModalOpen(false)}
      onConfirm={(payload) => {
        setCheckinOutingModalOpen(false);
        navigate('/checkin', { state: { checkinEvent: payload } });
      }}
      dismissButtonLabel="Cancel"
    />
  );

  const reservationModal = (
    <ReservationPickerModal
      open={reservationModalOpen}
      onDismiss={() => setReservationModalOpen(false)}
    />
  );

  if (isDesktop) {
    return (
      <>
        <div className="flex max-w-4xl flex-col gap-6">
          {gearHubHero}
          {hubStatsStrip}

          <div className="grid grid-cols-3 gap-4">{gearActionButtons}</div>

          <SlowLoadHint hint={slowHint} />

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">More detail</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
              {DESKTOP_EXTRA_STATS.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm"
                >
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

          {/* Active events with gear checked out */}
          {outings.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-gray-900">Active events with gear</h2>
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
        {outingModal}
        {checkinOutingModal}
        {reservationModal}
      </>
    );
  }

  return (
    <>
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

        <AnimateMain className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-4 pb-8 sm:px-5">
          {gearHubHero}
          {hubStatsStrip}

          <div className="flex shrink-0 flex-col gap-3">{gearActionButtons}</div>

          <SlowLoadHint hint={slowHint} />
        </AnimateMain>
      </div>
      {outingModal}
      {checkinOutingModal}
      {reservationModal}
    </>
  );
};

export default Landing;
