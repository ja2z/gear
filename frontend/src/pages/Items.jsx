import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useItems } from '../hooks/useInventory';
import ConnectionError from '../components/ConnectionError';

const Items = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const { addMultipleItems, getTotalItems, isItemInCart } = useCart();
  const { items, loading, error } = useItems(category);
  const [selectedItems, setSelectedItems] = useState([]);
  const [connectionError, setConnectionError] = useState(false);

  // Handle errors from the useItems hook
  useEffect(() => {
    if (error && !loading) {
      setConnectionError(true);
    }
  }, [error, loading]);

  // Reset scroll position when component mounts or category changes
  useEffect(() => {
    // Scroll to top when navigating to items page or when category changes
    // Use requestAnimationFrame to ensure this happens after the DOM is fully updated
    const scrollToTop = () => {
      window.scrollTo(0, 0);
    };
    
    requestAnimationFrame(scrollToTop);
  }, [category]);

  const toggleItem = (item) => {
    setSelectedItems(prev => {
      const isSelected = prev.find(selected => selected.itemId === item.itemId);
      if (isSelected) {
        return prev.filter(selected => selected.itemId !== item.itemId);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleAddSelectedToCart = () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item');
      return;
    }
    addMultipleItems(selectedItems);
    setSelectedItems([]);
    // Navigate back to categories using React Router
    navigate('/categories');
  };

  const handleRetry = () => {
    setConnectionError(false);
    // The useItems hook will automatically retry when the component re-renders
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (connectionError) {
    return <ConnectionError onRetry={handleRetry} onGoHome={handleGoHome} />;
  }

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link
          to="/categories"
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1 className="text-center text-truncate">{items.length > 0 ? items[0].itemDesc : category}</h1>
        <Link
          to="/cart"
          className="cart-badge no-underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cart-icon">
            <circle cx="8" cy="21" r="1"></circle>
            <circle cx="19" cy="21" r="1"></circle>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
          </svg>
          <span className="cart-count">{getTotalItems()}</span>
        </Link>
      </div>

      {/* Multi-select notice */}
      <div className="bg-blue-50 border border-blue-100 px-5 py-3 mx-5 mt-5 rounded-lg">
        <p className="text-scout-blue text-sm text-center">
          Tap items to select
        </p>
      </div>

      {/* Items List */}
      <div className="px-5 py-5 pb-20">
        <div className="space-y-3">
          {items.map((item) => {
            const isSelected = selectedItems.find(selected => selected.itemId === item.itemId);
            const isAvailable = item.status === 'In shed';
            const isUsable = item.condition === 'Usable';
            const isUnknown = item.condition === 'Unknown';
            const inCart = isItemInCart(item.itemId);
            const isSelectable = isAvailable && (isUsable || isUnknown) && !inCart;
            
            return (
              <div
                key={item.itemId}
                onClick={() => isSelectable && toggleItem(item)}
                className={`card touch-target ${
                  isSelectable ? 'cursor-pointer' : 'cursor-not-allowed'
                } ${
                  isSelected 
                    ? 'card-selected' 
                    : inCart
                      ? 'opacity-60 bg-green-50 border-green-200'
                      : !isSelectable 
                        ? 'opacity-60' 
                        : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-scout-blue">{item.itemId}</span>
                      <div className="flex items-center space-x-2">
                        {inCart && (
                          <span className="status-in-cart">
                            In cart
                          </span>
                        )}
                        {!isUsable && isAvailable && (
                          <span className={isUnknown ? 'status-condition-unknown' : 'status-unusable'}>
                            {isUnknown ? 'Condition unknown' : 'Unusable'}
                          </span>
                        )}
                        <span className={item.status === 'In shed' ? 'status-in-shed' : item.status === 'Checked out' ? 'status-checked-out' : item.status === 'Missing' ? 'status-missing' : 'status-out-for-repair'}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    {!isAvailable && item.outingName && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">Currently on: </span>
                        <span className="outing-badge">
                          {item.outingName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50" style={{width: '100vw'}}>
        <button
          onClick={handleAddSelectedToCart}
          disabled={selectedItems.length === 0}
          className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-full h-12 text-base font-medium px-6 has-[>svg]:px-4 no-underline ${
            selectedItems.length === 0 
              ? 'bg-gray-200 text-gray-500 shadow-xs hover:bg-gray-300' 
              : 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90'
          }`}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default Items;
