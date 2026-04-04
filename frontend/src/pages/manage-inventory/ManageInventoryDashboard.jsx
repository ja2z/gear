import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, FolderOpen, ScrollText, ChevronRight } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';

const ManageInventoryDashboard = () => {
  const navigate = useNavigate();
  const { getData } = useInventory();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getData('/inventory')
      .then(items => {
        const active = items.filter(i => i.status !== 'Removed from inventory');
        const checkedOut = active.filter(i => i.status === 'Checked out');
        const activeOutings = new Set(checkedOut.map(i => i.outingName).filter(Boolean)).size;
        setStats({
          total: active.length,
          inShed: active.filter(i => i.status === 'In shed').length,
          checkedOut: checkedOut.length,
          reserved: active.filter(i => i.status === 'Reserved').length,
          missing: active.filter(i => i.status === 'Missing').length,
          outForRepair: active.filter(i => i.status === 'Out for repair').length,
          activeOutings,
        });
      })
      .catch(() => {/* non-blocking */});
  }, []);

  const subStats = stats ? [
    { label: 'In Shed',       value: stats.inShed,      status: 'In shed',        color: 'text-white/90' },
    { label: 'Checked Out',   value: stats.checkedOut,  status: 'Checked out',    color: 'text-green-300' },
    { label: 'Reserved',      value: stats.reserved,    status: 'Reserved',       color: stats.reserved > 0 ? 'text-orange-300' : 'text-white/90' },
    { label: 'Missing',       value: stats.missing,     status: 'Missing',        color: stats.missing > 0 ? 'text-red-300' : 'text-white/90' },
    { label: 'Out for Repair',value: stats.outForRepair,status: 'Out for repair', color: stats.outForRepair > 0 ? 'text-yellow-300' : 'text-white/90' },
  ] : [];

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link to="/home" className="back-button no-underline">←</Link>
        <h1>Manage Inventory</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Gradient space with stats */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-scout-blue to-blue-950 px-5">
        {stats && (
          <div className="w-full space-y-3">
            {/* Hierarchy card */}
            <div className="bg-white/15 rounded-2xl overflow-hidden backdrop-blur-sm">
              {/* Total row */}
              <div className="px-4 py-3 border-b border-white/20 flex justify-between items-center">
                <span className="text-white font-semibold">Total Items</span>
                <span className="text-white font-bold text-xl">{stats.total}</span>
              </div>
              {/* Sub-stat rows — each is a link to filtered inventory */}
              {subStats.map((s, i) => (
                <Link
                  key={s.status}
                  to={`/manage-inventory/view?status=${encodeURIComponent(s.status)}`}
                  className={`flex justify-between items-center px-4 py-3 no-underline transition-colors active:bg-white/10 ${
                    i < subStats.length - 1 ? 'border-b border-white/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">↳</span>
                    <span className="text-white/80 text-sm">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold ${s.color}`}>{s.value}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-white/30" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Active outings card */}
            <Link
              to="/manage-inventory/view?status=Checked+out"
              className="block bg-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm no-underline transition-colors active:bg-white/25"
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold">Active Outings</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-bold text-xl">{stats.activeOutings}</span>
                  <ChevronRight className="h-4 w-4 text-white/30" />
                </div>
              </div>
              <p className="text-white/50 text-xs mt-0.5">outings with items currently checked out</p>
            </Link>
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
