import { Link, useSearchParams } from 'react-router-dom';

const Success = () => {
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action') || 'checkout';
  
  const isCheckin = action === 'checkin';
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <h1>{isCheckin ? 'Check-in Complete!' : 'Checkout Complete!'}</h1>
      </div>

      <div className="px-5 py-12">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isCheckin ? 'Gear Successfully Checked In' : 'Gear Successfully Checked Out'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isCheckin 
              ? 'Your gear has been successfully checked in and is now available for others to use.'
              : 'Your gear has been successfully checked out. You\'ll receive a confirmation email shortly.'
            }
          </p>
          
          <div className="space-y-3">
            <Link
              to="/"
              className="block w-full btn-primary p-4 text-center touch-target"
            >
              🏠 Return to Home
            </Link>
            
            {isCheckin ? (
              <Link
                to="/checkin/outings"
                className="block w-full btn-secondary p-4 text-center touch-target"
              >
                ✅ Check In More Gear
              </Link>
            ) : (
              <Link
                to="/categories"
                className="block w-full btn-secondary p-4 text-center touch-target"
              >
                🛒 Check Out More Gear
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;
