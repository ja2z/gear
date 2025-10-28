import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useInventory } from '../../hooks/useInventory';

const DeleteItem = () => {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const { toast, showToast, hideToast } = useToast();
  const { getData } = useInventory();
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
  const isValid = confirmText.toLowerCase() === 'delete item';

  // Fetch item details
  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        const data = await getData(`/manage-inventory/items/${itemId}`);
        setItem(data);
      } catch (error) {
        console.error('Error fetching item:', error);
        showToast('Failed to load item details', 'error');
        setTimeout(() => navigate('/manage-inventory/view'), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [itemId, navigate, getData]);

  const handleDelete = async () => {
    if (!isValid) return;
    
    try {
      setDeleteLoading(true);
      
      // Use custom fetch since useInventory doesn't have a DELETE method helper
      const API_BASE_URL = import.meta.env.PROD 
        ? (import.meta.env.VITE_API_URL || 'https://gear-backend.onrender.com/api')
        : '/api';
      
      const response = await fetch(`${API_BASE_URL}/manage-inventory/items/${itemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete item');

      showToast('Item removed successfully', 'success');
      setTimeout(() => {
        navigate('/manage-inventory/view');
      }, 1000);
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast('Failed to remove item. Please try again.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/manage-inventory/view');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Header */}
      <div className="header">
        <Link
          to="/manage-inventory/view"
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1>Delete Item</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-6 pb-32">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="text-center mb-6">
            <span className="text-5xl">⚠️</span>
            <h2 className="text-xl font-bold text-gray-900 mt-3">Delete Item?</h2>
          </div>
          
          <div className="mb-6 space-y-3 text-sm bg-gray-50 p-4 rounded-lg">
            <div>
              <span className="font-semibold text-gray-700">Item ID:</span>
              <span className="ml-2 text-gray-900">{item.itemId}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Description:</span>
              <span className="ml-2 text-gray-900">{item.description}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Current Status:</span>
              <span className="ml-2 text-gray-900">{item.status}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Current Condition:</span>
              <span className="ml-2 text-gray-900">{item.condition}</span>
            </div>
          </div>
          
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-gray-700">
              This will mark the item as <strong>"Removed from inventory"</strong> and hide it from the app. The item and its transaction history will be preserved in the database.
            </p>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type "delete item" to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="delete item"
              autoFocus
            />
          </div>
        </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50" style={{width: '100vw'}}>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={deleteLoading}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 min-h-[44px] disabled:opacity-50 font-medium transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isValid || deleteLoading}
            className={`flex-1 px-4 py-3 rounded-lg min-h-[44px] font-medium transition-all ${
              !isValid && !deleteLoading
                ? 'bg-gray-400 text-gray-100 cursor-not-allowed'
                : 'bg-scout-red text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {deleteLoading ? 'Deleting...' : 'Delete Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteItem;

