import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ArrowLeft, ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';

const Cart = () => {
  const { items, updateQuantity, removeItem, getTotalItems } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
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
              
              <h1 className="text-xl font-bold text-gray-900">Shopping Cart</h1>
              
              <div className="w-6"></div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some gear to get started!</p>
            <Link
              to="/categories"
              className="inline-block bg-scout-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors touch-target"
            >
              Browse Categories
            </Link>
          </div>
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
            
            <h1 className="text-xl font-bold text-gray-900">
              Cart ({getTotalItems()} items)
            </h1>
            
            <div className="w-6"></div>
          </div>
        </div>
      </div>

      {/* Cart Items */}
      <div className="container mx-auto px-4 py-4">
        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <div key={item.itemId} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.itemId}
                  </h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                      className="bg-gray-200 text-gray-700 p-1 rounded touch-target"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-semibold w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                      className="bg-gray-200 text-gray-700 p-1 rounded touch-target"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => removeItem(item.itemId)}
                    className="text-red-500 hover:text-red-700 p-1 touch-target"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Button */}
        <Link
          to="/checkout"
          className="block w-full bg-scout-green text-white text-center py-4 rounded-lg hover:bg-green-700 transition-colors touch-target font-semibold text-lg"
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
};

export default Cart;
