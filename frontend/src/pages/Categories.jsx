import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useSync } from "../context/SyncContext";
import { useCategories } from "../hooks/useInventory";
import ConnectionError from "../components/ConnectionError";

const Categories = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getTotalItems, getItemsInCartByCategory } = useCart();
  const { shouldSync, markSynced } = useSync();
  const urlSync = searchParams.get("sync") === "true";
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
      markSynced("checkout");
    }
  }, [categories, urlSync, markSynced]);

  // Reset scroll position when component mounts
  useEffect(() => {
    // Force immediate scroll to top, accounting for any browser restoration
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Immediate scroll
    scrollToTop();

    // iOS needs the double RAF
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToTop();
      });
    });

    // One final attempt after a brief delay for iOS
    const timeoutId = setTimeout(scrollToTop, 50);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleRetry = () => {
    setConnectionError(false);
    refreshCategories();
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const filteredCategories = categories.filter((category) => {
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link to="/" className="back-button no-underline">
          ←
        </Link>
        <h1 className="text-center text-truncate">Select Category</h1>
        <Link to="/cart" className="cart-badge no-underline">
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
      </div>

      {/* Search */}
      <div className="bg-white px-5 py-4 border-b border-gray-200">
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
              className="card touch-target block category-link no-underline"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">{category.description}</span>
                <div className="flex items-center space-x-2">
                  {(() => {
                    const itemsInCart = getItemsInCartByCategory(category.name);
                    const adjustedAvailable = category.available_count - itemsInCart;

                    return (
                      <>
                        {itemsInCart > 0 && <span className="status-in-cart">{itemsInCart} in cart</span>}
                        <span
                          className={`no-underline ${
                            adjustedAvailable === 0 ? "status-checked-out" : "status-in-shed"
                          }`}
                        >
                          {adjustedAvailable} available
                        </span>
                      </>
                    );
                  })()}
                </div>
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
