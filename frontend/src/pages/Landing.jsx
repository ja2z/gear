import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <h1>Scout Gear Checkout</h1>
      </div>

      {/* Content */}
      <div className="px-5 py-8">
        <div className="space-y-4">
          <Link
            to="/categories"
            className="block w-full btn-primary p-6 text-center text-lg touch-target"
          >
            📦 Check Out Gear
          </Link>

          <Link
            to="/checkin"
            className="block w-full btn-success p-6 text-center text-lg touch-target"
          >
            ✅ Check In Gear
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;
