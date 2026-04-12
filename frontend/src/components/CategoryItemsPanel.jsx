import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Loader2, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useItems } from '../hooks/useInventory';
import ConnectionError from './ConnectionError';
import SlowLoadHint from './SlowLoadHint';
import { useSlowLoad } from '../hooks/useSlowLoad';
import { AnimateMain } from './AnimateMain';
import HeaderProfileMenu from './HeaderProfileMenu';
import CheckoutOutingModal from './CheckoutOutingModal';

const MODAL_ADD_MIN_MS = 140;
const MODAL_ADDED_VISIBLE_MS = 220;

/** Viewport center points of item cards (for fly-to-cart from each row) */
function captureCategoryItemCardCenters(items) {
  return items
    .map((item) => {
      const el = document.querySelector(`[data-category-item-card="${item.itemId}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { itemId: item.itemId, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })
    .filter(Boolean);
}

function ModalCategoryTitleBar({ title, onClose, closeDisabled }) {
  return (
    <div className="relative shrink-0 border-b border-gray-200 bg-white px-2 py-2.5">
      <h2
        id="category-items-modal-title"
        className="px-11 text-center text-base font-semibold leading-snug text-gray-900"
      >
        {title}
      </h2>
      <button
        type="button"
        disabled={closeDisabled}
        onClick={() => onClose?.('dismiss')}
        className="absolute right-2 top-1/2 -translate-y-1/2 touch-target rounded-full p-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:pointer-events-none disabled:opacity-40"
        aria-label="Close"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>
    </div>
  );
}

/**
 * Item selection for one category — full page (/items/:category) or embedded in a modal (categories).
 */
export default function CategoryItemsPanel({
  category,
  mode,
  onClose,
  variant = 'page',
}) {
  const isModal = variant === 'modal';
  const navigate = useNavigate();
  const { addMultipleItems, getTotalItems, isItemInCart, reservationMeta, checkoutEvent } = useCart();
  const { items, loading, error } = useItems(category);
  const [selectedItems, setSelectedItems] = useState([]);
  const [connectionError, setConnectionError] = useState(false);
  /** Modal-only: brief “Adding…” then “Added” before exit animation */
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [modalAddSuccess, setModalAddSuccess] = useState(false);
  const modalAddTimersRef = useRef({ add: null, exit: null });
  /** While modal is open, suppress “In cart” UI for items just added until unmount */
  const modalHideInCartIdsRef = useRef(null);
  const slowHint = useSlowLoad(loading && items.length === 0);

  useEffect(() => {
    if (error && !loading) {
      setConnectionError(true);
    }
  }, [error, loading]);

  useEffect(() => {
    setSelectedItems([]);
    setIsAddingToCart(false);
    setModalAddSuccess(false);
  }, [category]);

  useEffect(() => {
    return () => {
      if (modalAddTimersRef.current.add) window.clearTimeout(modalAddTimersRef.current.add);
      if (modalAddTimersRef.current.exit) window.clearTimeout(modalAddTimersRef.current.exit);
    };
  }, []);

  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0);
    };
    requestAnimationFrame(scrollToTop);
  }, [category]);

  const modalCartBusy = isModal && (isAddingToCart || modalAddSuccess);

  const toggleItem = (item) => {
    if (modalCartBusy) return;
    setSelectedItems((prev) => {
      const isSelected = prev.find((selected) => selected.itemId === item.itemId);
      if (isSelected) {
        return prev.filter((selected) => selected.itemId !== item.itemId);
      }
      return [...prev, item];
    });
  };

  const handleAddSelectedToCart = () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item');
      return;
    }
    if (onClose) {
      if (modalAddTimersRef.current.add) window.clearTimeout(modalAddTimersRef.current.add);
      if (modalAddTimersRef.current.exit) window.clearTimeout(modalAddTimersRef.current.exit);
      setIsAddingToCart(true);
      modalAddTimersRef.current.add = window.setTimeout(() => {
        setIsAddingToCart(false);
        setModalAddSuccess(true);
        modalAddTimersRef.current.exit = window.setTimeout(() => {
          modalAddTimersRef.current.exit = null;
          const origins = captureCategoryItemCardCenters(selectedItems);
          onClose('addedToCart', selectedItems, origins);
        }, MODAL_ADDED_VISIBLE_MS);
      }, MODAL_ADD_MIN_MS);
      return;
    }
    addMultipleItems(selectedItems);
    setSelectedItems([]);
    navigate(`/categories?mode=${mode}`);
  };

  const handleRetry = () => {
    setConnectionError(false);
    window.location.reload();
  };

  const handleGoHome = () => {
    onClose?.('dismiss');
    navigate('/gear');
  };

  if (connectionError) {
    return <ConnectionError onRetry={handleRetry} onGoHome={handleGoHome} />;
  }

  if (loading && items.length === 0) {
    if (isModal) {
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
          <ModalCategoryTitleBar title={category} onClose={onClose} />
          <div className="flex flex-1 flex-col items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto mb-4"></div>
              <p className="text-gray-600">Loading items...</p>
              <SlowLoadHint hint={slowHint} />
            </div>
          </div>
        </div>
      );
    }
    return (
      <>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Loading items...</p>
            <SlowLoadHint hint={slowHint} />
          </div>
        </div>
        <CheckoutOutingModal open={needsOuting} onDismiss={() => navigate('/gear')} />
      </>
    );
  }

  const rootClass = isModal
    ? 'flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100'
    : 'h-screen-small flex flex-col bg-gray-100';

  return (
    <>
    <div className={rootClass}>
      {isModal ? (
        <ModalCategoryTitleBar
          title={items.length > 0 ? items[0].itemDesc : category}
          onClose={onClose}
          closeDisabled={modalCartBusy}
        />
      ) : (
        <div className={`header ${mode === 'reserve' ? 'header-reserve' : ''}`}>
          <Link to={`/categories?mode=${mode}`} className="back-button no-underline">
            ←
          </Link>
          <h1 className="text-center text-truncate">
            {items.length > 0 ? items[0].itemDesc : category}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <Link to={`/cart?mode=${mode}`} className="cart-badge no-underline">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="cart-icon"
              >
                <circle cx="8" cy="21" r="1"></circle>
                <circle cx="19" cy="21" r="1"></circle>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
              </svg>
              <span className="cart-count">{getTotalItems()}</span>
            </Link>
            <HeaderProfileMenu />
          </div>
        </div>
      )}

      <AnimateMain className="flex flex-1 flex-col min-h-0">
        <div
          className={`flex-1 overflow-y-auto min-h-0 ${modalCartBusy ? 'pointer-events-none opacity-[0.92]' : ''}`}
        >
          <div className="bg-blue-50 border border-blue-100 px-5 py-3 mx-5 mt-5 rounded-lg">
            <p className="text-scout-blue text-sm text-center">Tap items to select</p>
          </div>

          <div className="px-5 py-5 pb-20">
            <div className="space-y-3">
              {items.map((item) => {
                const isSelected = selectedItems.find((selected) => selected.itemId === item.itemId);
                const isAvailable = item.status === 'In shed';
                const isReserved = item.status === 'Reserved';
                const isUsable = item.condition === 'Usable';
                const isUnknown = item.condition === 'Unknown';
                const inCart = isItemInCart(item.itemId);
                const isOwnReservation =
                  isReserved &&
                  item.outingName === reservationMeta?.outingName &&
                  (reservationMeta?.isEditing || reservationMeta?.fromReservation);
                const isSelectable =
                  (isAvailable || isOwnReservation) && (isUsable || isUnknown) && !inCart;

                return (
                  <div
                    key={item.itemId}
                    data-category-item-card={item.itemId}
                    onClick={() => isSelectable && toggleItem(item)}
                    className={`card touch-target ${
                      isSelectable ? 'cursor-pointer' : 'cursor-not-allowed'
                    } ${
                      isSelected
                        ? 'card-selected'
                        : inCart
                          ? 'opacity-60 bg-green-50 border-green-200'
                          : !isSelectable && !isOwnReservation
                            ? 'opacity-60'
                            : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-scout-blue">{item.itemId}</span>
                          <div className="flex items-center space-x-2">
                            {inCart && <span className="status-in-cart">In cart</span>}
                            {!isUsable && isAvailable && (
                              <span
                                className={isUnknown ? 'status-condition-unknown' : 'status-unusable'}
                              >
                                {isUnknown ? 'Condition unknown' : 'Unusable'}
                              </span>
                            )}
                            <span
                              className={
                                isAvailable || isOwnReservation
                                  ? 'status-in-shed'
                                  : isReserved
                                    ? 'status-checked-out'
                                    : item.status === 'Checked out'
                                      ? 'status-checked-out'
                                      : item.status === 'Missing'
                                        ? 'status-missing'
                                        : 'status-out-for-repair'
                              }
                            >
                              {isOwnReservation ? 'Available' : item.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        {!isAvailable && !isOwnReservation && item.outingName && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">
                              {item.status === 'Reserved' ? 'Reserved for:' : 'Currently on:'}{' '}
                            </span>
                            <span className="outing-badge">{item.outingName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white border-t border-gray-200 p-4 shrink-0">
          {isModal && isAddingToCart ? (
            <div
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-scout-blue/12 border border-scout-blue/20 text-base font-medium text-scout-blue"
              aria-live="polite"
            >
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" strokeWidth={2} />
              Adding…
            </div>
          ) : isModal && modalAddSuccess ? (
            <div
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-green-200 bg-green-50 text-base font-semibold text-green-900"
              aria-live="polite"
            >
              <Check className="h-5 w-5 shrink-0 text-green-600" strokeWidth={2.5} />
              Added {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddSelectedToCart}
              disabled={selectedItems.length === 0 || modalCartBusy}
              className={`w-full h-12 text-base font-medium rounded-md disabled:opacity-50 ${
                selectedItems.length === 0 ? 'bg-gray-200 text-gray-500' : 'bg-scout-blue/12 border border-scout-blue/20 text-scout-blue'
              }`}
            >
              {selectedItems.length === 0
                ? 'Add to Cart'
                : `Add to Cart ${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'}`}
            </button>
          )}
        </div>
      </AnimateMain>
    </div>
    <CheckoutOutingModal open={variant === 'page' && needsOuting} onDismiss={() => navigate('/gear')} />
    </>
  );
}
