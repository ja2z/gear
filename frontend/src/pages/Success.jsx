import { Link, useSearchParams } from 'react-router-dom';

const Success = () => {
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action') || 'checkout';
  const count = parseInt(searchParams.get('count')) || 0;
  
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
            {isCheckin ? 'Gear Successfully Checked In' : 'Success!'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isCheckin 
              ? 'Your gear has been successfully checked in and is now available for others to use.'
              : `You checked out ${count} ${count === 1 ? 'item' : 'items'}.`
            }
          </p>
          
          <div className="space-y-3">
            <Link
              to="/"
              className="block w-full btn-primary p-4 text-center touch-target no-underline"
            >
              🏠 Return to Home
            </Link>
            
            {isCheckin && (
              <Link
                to="/checkin/outings"
                className="block w-full btn-secondary p-4 text-center touch-target"
              >
                ✅ Check In More Gear
              </Link>
            )}
          </div>
        </div>
        
        {/* Troop 222 Logo - 50px below Return to Home button */}
        <div className="mt-16 flex justify-center">
          <img 
            src="/Troop%20222%20Logo.webp" 
            alt="Troop 222 Logo" 
            className="max-w-xs w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default Success;
