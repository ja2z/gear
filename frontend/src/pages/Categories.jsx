import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSync } from '../context/SyncContext';
import { useCategories } from '../hooks/useInventory';
import ConnectionError from '../components/ConnectionError';

const Categories = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getTotalItems } = useCart();
  const { shouldSync, markSynced } = useSync();
  const urlSync = searchParams.get('sync') === 'true';
  const { categories, loading, error, refreshCategories } = useCategories(urlSync);
  const [connectionError, setConnectionError] = useState(false);

  // Handle errors from the useCategories hook
  useEffect(() => {
    if (error && !loading) {
      setConnectionError(true);
    }
  }, [error, loading]);

  // Mark as synced after successful load
  useEffect(() => {
    if (categories.length > 0 && urlSync) {
      markSynced('checkout');
    }
  }, [categories, urlSync, markSynced]);

  const handleRetry = () => {
    setConnectionError(false);
    refreshCategories();
  };

  const handleGoHome = () => {
    navigate('/');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link
          to="/"
          className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white text-lg"
        >
          ←
        </Link>
        <h1>Select Category</h1>
        <div className="absolute right-5 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
          {getTotalItems() > 0 && (
            <Link
              to="/cart"
              className="cart-badge"
            >
              {getTotalItems()}
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white px-5 py-4 border-b border-gray-200 sticky top-0 z-10">
        <input
          type="text"
          placeholder="Search for gear..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Categories List */}
      <div className="px-5 py-5 pb-20">
        <div className="space-y-3">
          {filteredCategories.map((category) => (
            <Link
              key={category.name}
              to={`/items/${category.name}`}
              className="card touch-target block"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">
                  {category.description}
                </span>
                <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs">
                  {category.availableCount} available
                </span>
              </div>
            </Link>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No categories found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
