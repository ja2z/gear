import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useItems } from '../hooks/useInventory';
import { ArrowLeft, ShoppingCart, Plus } from 'lucide-react';

const Items = () => {
  const { category } = useParams();
  const { addItem, getTotalItems } = useCart();
  const { items, loading } = useItems(category);

  const handleAddToCart = (item) => {
    addItem(item);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/categories"
              className="flex items-center space-x-2 text-gray-600 hover:text-scout-blue touch-target"
            >
              <ArrowLeft className="w-6 h-6" />
              <span className="font-medium">Back</span>
            </Link>
            
            <h1 className="text-xl font-bold text-gray-900">{category} Items</h1>
            
            <Link
              to="/cart"
              className="relative flex items-center space-x-1 text-gray-600 hover:text-scout-blue touch-target"
            >
              <ShoppingCart className="w-6 h-6" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 bg-scout-blue text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="container mx-auto px-4 py-4">
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.itemId}
              className="bg-white rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.itemId}
                  </h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.status === 'Available' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {item.condition}
                    </span>
                  </div>
                </div>
                
                {item.status === 'Available' && (
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="bg-scout-blue text-white p-2 rounded-lg hover:bg-blue-700 transition-colors touch-target"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Items;
