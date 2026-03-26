import { useNavigate, Link } from 'react-router-dom';
import { Package, FolderOpen, ScrollText } from 'lucide-react';

const ManageInventoryDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link to="/" className="back-button no-underline">←</Link>
        <h1>Manage Inventory</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Hero spacer — matches landing page feel */}
      <div className="flex-1 bg-gradient-to-b from-scout-blue to-blue-950"></div>

      {/* Bottom action bar */}
      <div className="shrink-0 bg-white px-5 pt-2 pb-7 space-y-3">
        {/* Primary row: Manage Items + Manage Categories side by side */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/manage-inventory/view')}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 touch-target bg-scout-blue text-white transition-all shadow-sm"
          >
            <Package className="h-6 w-6" />
            <span className="text-base font-bold">Manage Items</span>
          </button>

          <button
            onClick={() => navigate('/manage-inventory/categories')}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 touch-target bg-scout-green text-white transition-all shadow-sm"
          >
            <FolderOpen className="h-6 w-6" />
            <span className="text-base font-bold">Categories</span>
          </button>
        </div>

        {/* Tertiary: View Logs — outlined */}
        <button
          onClick={() => navigate('/manage-inventory/view-logs')}
          className="w-full flex items-center justify-center gap-2 rounded-full text-sm font-medium py-3 touch-target border-2 border-scout-red text-scout-red bg-transparent transition-all"
        >
          <ScrollText className="h-4 w-4" />
          View Logs
        </button>
      </div>
    </div>
  );
};

export default ManageInventoryDashboard;
