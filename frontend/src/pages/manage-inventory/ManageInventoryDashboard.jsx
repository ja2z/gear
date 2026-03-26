import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, FolderOpen, ScrollText } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';

const StatCard = ({ label, value, color }) => (
  <div className="flex-1 flex flex-col items-center justify-center bg-white/15 rounded-2xl py-4 px-2 backdrop-blur-sm">
    <span className={`text-3xl font-bold ${color}`}>{value}</span>
    <span className="text-white/80 text-xs mt-1 text-center leading-tight">{label}</span>
  </div>
);

const ManageInventoryDashboard = () => {
  const navigate = useNavigate();
  const { getData } = useInventory();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getData('/inventory')
      .then(items => {
        const active = items.filter(i => i.status !== 'Removed from inventory');
        setStats({
          total: active.length,
          checkedOut: active.filter(i => i.status === 'Checked out').length,
          missing: active.filter(i => i.status === 'Missing').length,
        });
      })
      .catch(() => {/* non-blocking — stats just stay hidden */});
  }, []);

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link to="/" className="back-button no-underline">←</Link>
        <h1>Manage Inventory</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Gradient space with stats */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-scout-blue to-blue-950 px-6">
        {stats && (
          <div className="w-full space-y-3">
            <p className="text-white/60 text-xs text-center uppercase tracking-widest font-medium">
              Current Inventory
            </p>
            <div className="flex gap-3">
              <StatCard label="Total Items" value={stats.total} color="text-white" />
              <StatCard label="Checked Out" value={stats.checkedOut} color="text-green-300" />
              <StatCard
                label="Missing"
                value={stats.missing}
                color={stats.missing > 0 ? 'text-red-300' : 'text-white'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 bg-white px-5 pt-2 pb-7 space-y-3">
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
