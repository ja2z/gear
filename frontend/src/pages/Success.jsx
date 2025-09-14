import { Link } from 'react-router-dom';

const Success = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <h1>Checkout Complete!</h1>
      </div>

      <div className="px-5 py-12">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gear Successfully Checked Out</h2>
          <p className="text-gray-600 mb-6">
            Your gear has been successfully checked out. You'll receive a confirmation email shortly.
          </p>
          
          <div className="space-y-3">
            <Link
              to="/"
              className="block w-full btn-primary p-4 text-center touch-target"
            >
              🏠 Return to Home
            </Link>
            
            <Link
              to="/categories"
              className="block w-full btn-secondary p-4 text-center touch-target"
            >
              🛒 Check Out More Gear
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;
