import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const { items, removeItem, getTotalItems } = useCart();
  const [viewMode, setViewMode] = useState('items'); // 'items' or 'categories'
  const [buttonRenderKey, setButtonRenderKey] = useState(0);

  // Custom remove handler that forces complete button re-render
  const handleRemoveItem = (itemId) => {
    removeItem(itemId);
    // Force complete re-render of all buttons by changing the render key
    setButtonRenderKey(prev => prev + 1);
  };

  // Reset scroll position when component mounts
  useEffect(() => {
    // Scroll to first category using the same logic as scrollToCategory
    const scrollToFirstCategory = () => {
      const categories = Object.keys(getItemsByCategory());
      if (categories.length > 0) {
        const firstCategory = categories[0];
        const element = document.getElementById(`category-${firstCategory}`);
        if (element) {
          const elementRect = element.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + window.pageYOffset;
          // Use same offset as scrollToCategory function
          const targetPosition = absoluteElementTop - 140;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }
    };
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(scrollToFirstCategory, 100);
  }, []);


  // Reset scroll position when switching view modes
  useEffect(() => {
    // Scroll to first category when switching to items view
    const scrollToFirstCategory = () => {
      if (viewMode === 'items') {
        const categories = Object.keys(getItemsByCategory());
        if (categories.length > 0) {
          const firstCategory = categories[0];
          const element = document.getElementById(`category-${firstCategory}`);
          if (element) {
            const elementRect = element.getBoundingClientRect();
            const absoluteElementTop = elementRect.top + window.pageYOffset;
            // Use same offset as scrollToCategory function
            const targetPosition = absoluteElementTop - 140;
            window.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            });
          }
        }
      } else {
        // For categories view, scroll to top of categories list
        // Find the first category button and scroll to it
        const firstCategoryButton = document.querySelector('.card.touch-target.block');
        if (firstCategoryButton) {
          const elementRect = firstCategoryButton.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + window.pageYOffset;
          const targetPosition = absoluteElementTop - 140;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        } else {
          // Fallback to pixel-based scroll
          window.scrollTo(0, 140);
        }
      }
    };
    
    requestAnimationFrame(scrollToFirstCategory);
  }, [viewMode]);

  // Group items by category for categories view
  const getItemsByCategory = () => {
    const grouped = {};
    items.forEach(item => {
      const category = item.itemClass || 'Other';
      const categoryDesc = item.itemDesc || 'Other';
      if (!grouped[category]) {
        grouped[category] = {
          items: [],
          description: categoryDesc
        };
      }
      grouped[category].items.push(item);
    });
    return grouped;
  };

  // Scroll to category anchor
  const scrollToCategory = (category) => {
    setViewMode('items');
    // Use setTimeout to ensure the view mode change has rendered
    setTimeout(() => {
      const element = document.getElementById(`category-${category}`);
      if (element) {
        // Get the current scroll position and the element position
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.pageYOffset;
        // Scroll to position the element just below the sticky toggle control
        // Header height (~64px) + toggle control height (~60px) + some padding
        const targetPosition = absoluteElementTop - 140; // Increased from 120 to 140
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="header">
          <Link
            to="/categories"
            className="back-button no-underline"
          >
            ←
          </Link>
          <h1>Your Cart ({getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'})</h1>
          <div className="w-10 h-10"></div>
        </div>

        <div className="px-5 py-12">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 size-40" style={{width: '96px', height: '96px'}} key="large-cart-icon">
                <circle cx="8" cy="21" r="1"></circle>
                <circle cx="19" cy="21" r="1"></circle>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some gear to get started!</p>
            <Link
              to="/categories"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive px-6 py-3 bg-scout-blue text-white shadow-xs hover:bg-scout-blue touch-target no-underline"
            >
              Browse Categories
            </Link>
          </div>
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
        <h1>Your Cart ({getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'})</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Toggle Control */}
      <div className="bg-white px-5 py-3 border-b border-gray-200 sticky top-16 z-40">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setViewMode('items')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all touch-target ${
              viewMode === 'items'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Items
          </button>
          <button
            onClick={() => setViewMode('categories')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all touch-target ${
              viewMode === 'categories'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Categories
          </button>
        </div>
      </div>

      {/* Cart Content */}
      <div className="px-5 py-5 pb-20">
        {viewMode === 'items' ? (
          // Items View
          <div className="space-y-3">
            {Object.entries(getItemsByCategory()).map(([category, categoryData]) => (
              <div key={category}>
                {/* Category Header with Anchor */}
                <div id={`category-${category}`} className="mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">{categoryData.description}</h2>
                </div>
                
                {/* Items in this category */}
                <div className="space-y-3 mb-6">
                  {categoryData.items.map((item, index) => (
                    <div key={`${item.itemId}-${index}`} className="card">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {item.itemId}
                          </h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                        
                        <button
                          key={`remove-${item.itemId}-${buttonRenderKey}`}
                          onClick={() => handleRemoveItem(item.itemId)}
                          className="remove-item-btn-clean ml-3 touch-target"
                          title="Remove item"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Categories View
          <div className="space-y-3">
            {Object.entries(getItemsByCategory()).map(([category, categoryData]) => (
              <button
                key={category}
                onClick={() => scrollToCategory(category)}
                className="card touch-target block w-full text-left no-underline"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base text-gray-900">
                    {categoryData.description}
                  </span>
                  <span className="status-in-shed">
                    {categoryData.items.length} {categoryData.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50" style={{width: '100vw'}}>
        <Link
          to="/checkout"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-full h-12 text-base font-medium px-6 has-[>svg]:px-4 bg-scout-blue text-white shadow-xs hover:bg-scout-blue text-center no-underline"
        >
          Go to Checkout
        </Link>
      </div>
    </div>
  );
};

export default Cart;
