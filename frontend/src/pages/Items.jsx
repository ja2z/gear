import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useItems } from '../hooks/useInventory';
import ConnectionError from '../components/ConnectionError';

const Items = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const { addMultipleItems, getTotalItems } = useCart();
  const { items, loading, error } = useItems(category);
  const [selectedItems, setSelectedItems] = useState([]);
  const [connectionError, setConnectionError] = useState(false);

  // Handle errors from the useItems hook
  useEffect(() => {
    if (error && !loading) {
      setConnectionError(true);
    }
  }, [error, loading]);

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
    // Navigate back to categories
    window.history.back();
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
          className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white text-lg"
        >
          ←
        </Link>
        <h1>{items.length > 0 ? items[0].itemDesc : category}</h1>
        {getTotalItems() > 0 && (
          <Link
            to="/cart"
            className="absolute right-5 top-1/2 transform -translate-y-1/2 cart-badge"
          >
            {getTotalItems()}
          </Link>
        )}
      </div>

      {/* Multi-select notice */}
      <div className="bg-blue-50 border border-blue-200 px-5 py-3 mx-5 mt-5 rounded-lg">
        <p className="text-blue-800 text-sm text-center">
          Tap items to select multiple. Selected items will be highlighted.
        </p>
      </div>

      {/* Items List */}
      <div className="px-5 py-5 pb-20">
        <div className="space-y-3">
          {items.map((item) => {
            const isSelected = selectedItems.find(selected => selected.itemId === item.itemId);
            const isAvailable = item.status === 'Available';
            const isUsable = item.condition === 'Usable';
            const isSelectable = isAvailable && isUsable;
            
            return (
              <div
                key={item.itemId}
                onClick={() => isSelectable && toggleItem(item)}
                className={`card touch-target ${
                  isSelectable ? 'cursor-pointer' : 'cursor-not-allowed'
                } ${
                  isSelected 
                    ? 'card-selected' 
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
                        {!isUsable && isAvailable && (
                          <span className="status-unusable">
                            Unusable
                          </span>
                        )}
                        <span className={item.status === 'Available' ? 'status-available' : 'status-checked-out'}>
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
      <div className="bottom-nav">
        <div className="flex gap-3">
          <button
            onClick={() => window.history.back()}
            className="nav-btn btn-secondary"
          >
            Back
          </button>
          <button
            onClick={handleAddSelectedToCart}
            disabled={selectedItems.length === 0}
            className={`nav-btn ${
              selectedItems.length === 0 
                ? 'btn-secondary disabled:opacity-50 disabled:cursor-not-allowed' 
                : 'btn-primary'
            }`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default Items;
