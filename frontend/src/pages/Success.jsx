import { Link } from 'react-router-dom';
import { CheckCircle, Home, ShoppingCart } from 'lucide-react';

const Success = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-4">
        <div className="bg-white rounded-lg p-8 shadow-lg">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Checkout Successful!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your gear has been successfully checked out. You'll receive a confirmation email shortly.
          </p>
          
          <div className="space-y-3">
            <Link
              to="/"
              className="block w-full bg-scout-blue text-white py-3 rounded-lg hover:bg-blue-700 transition-colors touch-target font-semibold"
            >
              <Home className="w-5 h-5 inline mr-2" />
              Back to Home
            </Link>
            
            <Link
              to="/categories"
              className="block w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors touch-target font-semibold"
            >
              <ShoppingCart className="w-5 h-5 inline mr-2" />
              Check Out More Gear
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;
