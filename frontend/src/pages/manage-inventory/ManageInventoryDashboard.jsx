import { useNavigate, Link } from 'react-router-dom';

const ManageInventoryDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link
          to="/"
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1>Manage Inventory</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-8">
          <div className="space-y-6">
            <button
              onClick={() => navigate('/manage-inventory/view')}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] w-full p-6 text-center text-lg touch-target bg-scout-blue text-white shadow-xs hover:bg-scout-blue/90"
            >
              📦 Manage Items
            </button>

            <button
              onClick={() => navigate('/manage-inventory/categories')}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] w-full p-6 text-center text-lg touch-target bg-scout-green text-white shadow-xs hover:bg-green-700"
            >
              📁 Manage Categories
            </button>

            <button
              onClick={() => navigate('/manage-inventory/view-logs')}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] w-full p-6 text-center text-lg touch-target bg-scout-red text-white shadow-xs hover:bg-purple-700"
            >
              📋 View Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageInventoryDashboard;

