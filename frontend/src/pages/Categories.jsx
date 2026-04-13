import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCategories, useInventory } from '../hooks/useInventory';
import ConnectionError from '../components/ConnectionError';
import SlowLoadHint from '../components/SlowLoadHint';
import { useSlowLoad } from '../hooks/useSlowLoad';
import { AnimateMain } from '../components/AnimateMain';
import CategoryItemsPanel from '../components/CategoryItemsPanel';
import CheckoutOutingModal from '../components/CheckoutOutingModal';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';
import { eventKindLabel } from '../utils/eventKindLabel';
import { X } from 'lucide-react';

const Categories = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [modalExiting, setModalExiting] = useState(false);
  const [modalExitKind, setModalExitKind] = useState(null);
  const [cartBump, setCartBump] = useState(false);
  const [flyToCart, setFlyToCart] = useState(null);
  const cartFlyTargetRef = useRef(null);
  const cartBumpTimerRef = useRef(null);
  const pendingAddTimerRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'checkout';
  const {
    items: cartItems,
    getTotalItems,
    getItemsInCartByCategory,
    reservationMeta,
    checkoutEvent,
    addMultipleItems,
    mergeReservationMeta,
    setCheckoutEvent,
  } = useCart();
  const { categories, loading, error, refreshCategories } = useCategories();
  const { getData } = useInventory();
  const [connectionError, setConnectionError] = useState(false);
  const slowHint = useSlowLoad(loading && categories.length === 0);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (error && !loading) {
      setConnectionError(true);
    }
  }, [error, loading]);

  const reservationMetaRef = useRef(reservationMeta);
  reservationMetaRef.current = reservationMeta;
  const checkoutEventRef = useRef(checkoutEvent);
  checkoutEventRef.current = checkoutEvent;

  /** Backfill event kind for banner whenever reservationMeta is loaded (reserve or checkout-from-reservation). */
  useEffect(() => {
    if (!reservationMeta?.eventId || reservationMeta.eventType) return;
    let cancelled = false;
    const id = reservationMeta.eventId;
    getData(`/events/${id}`)
      .then((ev) => {
        if (cancelled || !ev?.eventType) return;
        const prev = reservationMetaRef.current;
        if (!prev || String(prev.eventId) !== String(id)) return;
        mergeReservationMeta({ eventType: ev.eventType });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reservationMeta?.eventId, reservationMeta?.eventType, getData, mergeReservationMeta]);

  useEffect(() => {
    if (mode !== 'checkout' || !checkoutEvent?.eventId || checkoutEvent?.eventType) return;
    let cancelled = false;
    const id = checkoutEvent.eventId;
    getData(`/events/${id}`)
      .then((ev) => {
        if (cancelled || !ev?.eventType) return;
        const prev = checkoutEventRef.current;
        if (!prev || String(prev.eventId) !== String(id)) return;
        setCheckoutEvent({ ...prev, eventType: ev.eventType });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mode, checkoutEvent?.eventId, checkoutEvent?.eventType, getData, setCheckoutEvent]);

  const gearOutingLine = useMemo(() => {
    const lineFromEventLike = (ev) => {
      if (!ev) return null;
      const display =
        ev.outingName?.trim() ||
        (ev.eventId != null && String(ev.eventId) !== '' ? `Event ${ev.eventId}` : '');
      if (!display) return null;
      return { kind: eventKindLabel(ev.eventType), display };
    };

    if (mode === 'reserve' && reservationMeta) {
      return lineFromEventLike(reservationMeta);
    }
    if (mode === 'checkout') {
      return lineFromEventLike(checkoutEvent) ?? lineFromEventLike(reservationMeta);
    }
    return null;
  }, [mode, reservationMeta, checkoutEvent]);

  useDesktopHeader({
    title: mode === 'reserve' ? 'Reserve Gear' : 'Select Category',
    ...(gearOutingLine && {
      subtitle: `${gearOutingLine.kind}: ${gearOutingLine.display}`,
    }),
  });

  const needsOuting =
    mode !== 'reserve' && !reservationMeta?.eventId && !checkoutEvent?.eventId;

  useEffect(() => {
    if (!selectedCategory) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedCategory]);

  useEffect(() => {
    if (!flyToCart) return;
    const t = window.setTimeout(() => setFlyToCart(null), 900); /* 0.8s animation + buffer; keep in sync with index.css */
    return () => window.clearTimeout(t);
  }, [flyToCart]);

  useEffect(() => {
    if (!cartBump) return;
    const t = window.setTimeout(() => setCartBump(false), 580);
    return () => window.clearTimeout(t);
  }, [cartBump]);

  useEffect(() => {
    return () => {
      if (cartBumpTimerRef.current) window.clearTimeout(cartBumpTimerRef.current);
      if (pendingAddTimerRef.current) window.clearTimeout(pendingAddTimerRef.current);
    };
  }, []);

  const closeCategoryModal = useCallback(
    (reason = 'dismiss', itemsToAdd = null, cardOrigins = null) => {
      if (!selectedCategory || modalExiting) return;
      if (reason === 'addedToCart' && itemsToAdd?.length) {
        const filtered = Array.isArray(cardOrigins)
          ? cardOrigins.filter((o) => o && typeof o.x === 'number')
          : [];
        const cartEl = cartFlyTargetRef.current;
        const cartRect = cartEl?.getBoundingClientRect();
        const cartCx = cartRect ? cartRect.left + cartRect.width / 2 : null;
        const cartCy = cartRect ? cartRect.top + cartRect.height / 2 : null;
        let origins = filtered;
        if (cartCx != null && cartCy != null) {
          if (filtered.length > 0) {
            origins = filtered.map((o) => ({
              ...o,
              flyDx: cartCx - o.x,
              flyDy: cartCy - o.y,
            }));
          } else {
            const fx = window.innerWidth / 2;
            const fy = window.innerHeight * 0.68;
            origins = [
              {
                itemId: 'aggregate',
                x: fx,
                y: fy,
                flyDx: cartCx - fx,
                flyDy: cartCy - fy,
              },
            ];
          }
        }
        setFlyToCart({
          id: Date.now(),
          origins,
          aggregateCount: itemsToAdd.length,
        });

        // Bump cart when the chip visually lands (~72% of fly — see keyframes in index.css), not after full fade
        const prefersReduced =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const bumpDelayMs = prefersReduced ? 0 : 575; // ~0.8s × 0.72 (land keyframe); keep in sync with fly-to-cart-tag duration

        if (pendingAddTimerRef.current) window.clearTimeout(pendingAddTimerRef.current);
        pendingAddTimerRef.current = window.setTimeout(() => {
          pendingAddTimerRef.current = null;
          addMultipleItems(itemsToAdd);
        }, bumpDelayMs);

        if (cartBumpTimerRef.current) window.clearTimeout(cartBumpTimerRef.current);
        cartBumpTimerRef.current = window.setTimeout(() => {
          cartBumpTimerRef.current = null;
          setCartBump(true);
        }, bumpDelayMs);
      }
      setModalExitKind(reason === 'addedToCart' ? 'addedToCart' : 'dismiss');
      setModalExiting(true);
    },
    [selectedCategory, modalExiting, addMultipleItems]
  );

  useEffect(() => {
    if (!modalExiting) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = prefersReduced
      ? 0
      : modalExitKind === 'addedToCart'
        ? 440
        : 320;
    const t = window.setTimeout(() => {
      setSelectedCategory(null);
      setModalExiting(false);
      setModalExitKind(null);
    }, ms);
    return () => window.clearTimeout(t);
  }, [modalExiting, modalExitKind]);

  useEffect(() => {
    if (!selectedCategory) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeCategoryModal('dismiss');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedCategory, closeCategoryModal]);

  const handleRetry = () => {
    setConnectionError(false);
    refreshCategories();
  };

  const handleGoHome = () => {
    navigate('/gear');
  };

  const filteredCategories = categories.filter(category => {
    const searchLower = searchTerm.toLowerCase();
    return (
      category.name.toLowerCase().includes(searchLower) ||
      category.description.toLowerCase().includes(searchLower) ||
      (category.item_descriptions && category.item_descriptions.toLowerCase().includes(searchLower))
    );
  });

  if (connectionError) {
    return <ConnectionError onRetry={handleRetry} onGoHome={handleGoHome} />;
  }

  if (loading && categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
          <SlowLoadHint hint={slowHint} />
        </div>
      </div>
    );
  }

  /* ── Shared: category card ── */
  const renderCategoryCard = (category) => (
    <button
      type="button"
      key={category.name}
      onClick={() => setSelectedCategory(category.name)}
      className="card touch-target block category-link w-full cursor-pointer text-left no-underline"
      aria-label={`Open ${category.description}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-base">
          {category.description}
        </span>
        <div className="flex items-center space-x-2">
          {(() => {
            const itemsInCart = getItemsInCartByCategory(category.name);
            const inShedInCart = cartItems.filter(i => i.itemClass === category.name && i.status === 'In shed').length;
            let adjustedAvailable = category.available_count - inShedInCart;
            if (reservationMeta?.isEditing || reservationMeta?.fromReservation) {
              const originalInCategory = (reservationMeta.originalItems || []).filter(i => i.itemClass === category.name);
              const ownReservationNotInCart = originalInCategory.filter(
                i => !cartItems.some(ci => ci.itemId === i.itemId)
              ).length;
              adjustedAvailable += ownReservationNotInCart;
            }
            
            return (
              <>
                {itemsInCart > 0 && (
                  <span className="status-in-cart">
                    {itemsInCart} in cart
                  </span>
                )}
                <span className={`no-underline ${
                  adjustedAvailable === 0 
                    ? 'status-checked-out' 
                    : 'status-in-shed'
                }`}>
                  {adjustedAvailable} available
                </span>
              </>
            );
          })()}
        </div>
      </div>
    </button>
  );

  const emptyState = filteredCategories.length === 0 && (
    <div className="text-center py-12">
      <p className="text-gray-500">No categories found matching your search.</p>
    </div>
  );

  const gearOutingBanner = gearOutingLine && (
    <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3">
      <p
        className="truncate text-center text-base text-gray-900"
        title={`${gearOutingLine.kind}: ${gearOutingLine.display}`}
      >
        <span className="font-semibold text-gray-600">{gearOutingLine.kind}:</span>{' '}
        <span className="font-semibold">{gearOutingLine.display}</span>
      </p>
    </div>
  );

  /* ── Shared: category items modal ── */
  const categoryModal = selectedCategory && (
    <div
      className="modal-dialog-overlay-root select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-items-modal-title"
    >
      <div
        role="presentation"
        aria-hidden
        className={`modal-dialog-backdrop-surface ${
          modalExiting ? 'modal-dialog-backdrop-exit' : 'modal-dialog-backdrop-enter'
        }`}
        onClick={() => closeCategoryModal('dismiss')}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div
          className={`pointer-events-auto relative z-[101] flex h-[min(85dvh,34rem)] w-full max-w-[22rem] flex-col overflow-hidden rounded-2xl bg-gray-100 shadow-2xl ${
            modalExiting
              ? modalExitKind === 'addedToCart'
                ? 'modal-dialog-panel-exit-added'
                : 'modal-dialog-panel-exit'
              : 'modal-dialog-panel-enter'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
        <CategoryItemsPanel
          key={selectedCategory}
          category={selectedCategory}
          mode={mode}
          variant="modal"
          onClose={closeCategoryModal}
        />
        </div>
      </div>
    </div>
  );

  /* ── Shared: fly-to-cart animation ── */
  const flyToCartOverlay = flyToCart && (
    <div className="pointer-events-none fixed inset-0 z-[110]" aria-hidden>
      {(flyToCart.origins?.length ?? 0) > 0 ? (
        flyToCart.origins.map((o) => (
          <div
            key={`${flyToCart.id}-${o.itemId}`}
            className="fly-to-cart-tag-animate absolute"
            style={{
              left: o.x,
              top: o.y,
              ...(typeof o.flyDx === 'number' &&
                typeof o.flyDy === 'number' && {
                  '--fly-dx': `${o.flyDx}px`,
                  '--fly-dy': `${o.flyDy}px`,
                }),
            }}
          >
            <span
              className={
                o.itemId === 'aggregate'
                  ? 'inline-flex min-w-[2.5rem] items-center justify-center rounded-full bg-green-600 px-3 py-1.5 text-sm font-bold text-white shadow-lg ring-2 ring-white/30'
                  : 'inline-flex min-w-[2rem] items-center justify-center rounded-full bg-green-600 px-2.5 py-1 text-xs font-bold text-white shadow-lg ring-2 ring-white/30'
              }
            >
              {o.itemId === 'aggregate' ? `+${flyToCart.aggregateCount}` : '+1'}
            </span>
          </div>
        ))
      ) : (
        <div key={flyToCart.id} className="fly-to-cart-tag-animate absolute left-1/2 top-[68%]">
          <span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-full bg-green-600 px-3 py-1.5 text-sm font-bold text-white shadow-lg ring-2 ring-white/30">
            +{flyToCart.aggregateCount}
          </span>
        </div>
      )}
    </div>
  );

  /* ── Desktop layout ── */
  if (isDesktop) {
    const totalItems = getTotalItems();
    return (
      <AnimateMain className="flex flex-1 flex-col min-h-0">
        <div className="border-b border-gray-200 bg-white px-5 py-4">
          <div className="relative">
            <input
              type="text"
              autoComplete="off"
              placeholder="Search for gear..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`search-input w-full ${searchTerm ? 'pr-10' : ''}`}
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="touch-target absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        {gearOutingBanner}

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 lg:grid lg:grid-cols-[1fr_18rem] lg:gap-6">
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredCategories.map(renderCategoryCard)}
              </div>
              {emptyState}
            </div>

            <div>
              <div className="sticky top-5">
                <div className="card p-5">
                  <div ref={cartFlyTargetRef} className="flex items-center gap-3 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-scout-blue">
                      <circle cx="8" cy="21" r="1"></circle>
                      <circle cx="19" cy="21" r="1"></circle>
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
                    </svg>
                    <span className="font-semibold text-gray-900 text-base">Cart</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </p>
                  <Link
                    to={`/cart?mode=${mode}`}
                    className="flex items-center justify-center w-full h-12 rounded-md bg-scout-blue text-white text-base font-medium no-underline"
                  >
                    View Cart
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {categoryModal}
        {flyToCartOverlay}
      </AnimateMain>
    );
  }

  /* ── Mobile layout (unchanged) ── */
  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <div className={`header ${mode === 'reserve' ? 'header-reserve' : ''}`}>
        <Link
          to="/gear"
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1 className="text-center text-truncate">{mode === 'reserve' ? 'Reserve Gear' : 'Select Category'}</h1>
        <HeaderProfileMenu />
      </div>

      <AnimateMain className="flex flex-1 flex-col min-h-0">
      <div className="border-b border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              autoComplete="off"
              placeholder="Search for gear..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`search-input w-full min-w-0 ${searchTerm ? 'pr-10' : ''}`}
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="touch-target absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </div>
          <Link
            ref={cartFlyTargetRef}
            to={`/cart?mode=${mode}`}
            className={`cart-badge shrink-0 no-underline ${cartBump ? 'cart-badge-bump-animate' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cart-icon">
              <circle cx="8" cy="21" r="1"></circle>
              <circle cx="19" cy="21" r="1"></circle>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
            </svg>
            <span className="cart-count">{getTotalItems()}</span>
          </Link>
        </div>
      </div>

      {gearOutingBanner}

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-5 pb-20">
          <div className="space-y-3">
            {filteredCategories.map(renderCategoryCard)}
          </div>
          {emptyState}
        </div>
      </div>
      </AnimateMain>

      {categoryModal}
      {flyToCartOverlay}
      <CheckoutOutingModal open={needsOuting} onDismiss={() => navigate('/gear')} />
    </div>
  );
};

export default Categories;
