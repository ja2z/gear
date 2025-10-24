import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useInventory } from '../../hooks/useInventory';

const ManageInventoryDashboard = () => {
  const navigate = useNavigate();
  const { postData } = useInventory();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Sync data from Google Sheets to SQLite on mount
  useEffect(() => {
    const syncData = async () => {
      try {
        setSyncing(true);
        setSyncError(null);
        
        // Trigger sync endpoint that will read from Google Sheets and update SQLite
        await postData('/manage-inventory/sync', {});
        
        console.log('Successfully synced inventory data');
      } catch (error) {
        console.error('Error syncing data:', error);
        setSyncError('Failed to sync data. Some features may not work correctly.');
      } finally {
        setSyncing(false);
      }
    };

    syncData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
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

      {/* Sync Error Display */}
      {syncError && (
        <div className="px-5 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{syncError}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {syncing && (
        <div className="px-5 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Syncing inventory data...</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!syncing && (
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
      )}
    </div>
  );
};

export default ManageInventoryDashboard;

