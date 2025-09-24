import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const { items, removeItem, getTotalItems } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="header">
          <Link
            to="/categories"
            className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white text-lg"
          >
            ←
          </Link>
          <h1>Your Cart</h1>
        </div>

        <div className="px-5 py-12">
          <div className="text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some gear to get started!</p>
            <Link
              to="/categories"
              className="inline-block btn-primary px-6 py-3 touch-target"
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
          className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white text-lg"
        >
          ←
        </Link>
        <h1>Your Cart</h1>
      </div>

      {/* Cart Items */}
      <div className="px-5 py-5 pb-20">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.itemId} className="card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {item.itemId}
                  </h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                
                <button
                  onClick={() => removeItem(item.itemId)}
                  className="btn-danger rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold ml-3 touch-target"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="flex gap-4">
          <Link
            to="/categories"
            className="nav-btn btn-secondary text-center no-underline"
          >
            Back
          </Link>
          <Link
            to="/checkout"
            className="nav-btn btn-primary text-center no-underline"
          >
            Go to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
