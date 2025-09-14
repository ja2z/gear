import { Link } from 'react-router-dom';
import { ShoppingCart, ArrowLeft } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-scout-blue to-scout-green">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Scout Gear Management
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Digital inventory tracking and checkout system for Troop gear
          </p>
        </div>

        {/* Main Action Buttons */}
        <div className="max-w-md mx-auto space-y-6">
          <Link
            to="/categories"
            className="block w-full bg-white text-scout-blue hover:bg-gray-50 transition-colors duration-200 rounded-xl p-6 shadow-lg touch-target"
          >
            <div className="flex items-center justify-center space-x-3">
              <ShoppingCart className="w-8 h-8" />
              <div className="text-left">
                <h2 className="text-2xl font-bold">Check Out Gear</h2>
                <p className="text-gray-600">Select and checkout gear for outings</p>
              </div>
            </div>
          </Link>

          <Link
            to="/checkin"
            className="block w-full bg-scout-gold text-white hover:bg-yellow-600 transition-colors duration-200 rounded-xl p-6 shadow-lg touch-target"
          >
            <div className="flex items-center justify-center space-x-3">
              <ArrowLeft className="w-8 h-8" />
              <div className="text-left">
                <h2 className="text-2xl font-bold">Check In Gear</h2>
                <p className="text-yellow-100">Return gear after outings</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-white/70 text-sm">
            Troop Gear Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
