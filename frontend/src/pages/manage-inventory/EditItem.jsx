import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import {
  validateItemDescription,
  validateCost,
  validateCondition,
  validateNotes
} from '../../utils/validation';

// Configure API base URL based on environment
const API_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || 'https://gear-backend.onrender.com')
  : 'http://localhost:3001';

const EditItem = () => {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const { toast, showToast, hideToast } = useToast();

  const [item, setItem] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    inApp: true,
    condition: '',
    status: '',
    purchaseDate: '',
    cost: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchItem();
  }, [itemId]);

  const fetchItem = async () => {
    try {
      setFetchLoading(true);
      const response = await fetch(`${API_URL}/api/manage-inventory/items/${itemId}`);
      if (!response.ok) throw new Error('Item not found');
      const data = await response.json();
      
      setItem(data);
      setFormData({
        description: data.description || '',
        inApp: data.inApp,
        condition: data.condition || '',
        status: data.status || '',
        purchaseDate: data.purchaseDate || '',
        cost: data.cost || '',
        notes: data.notes || ''
      });
    } catch (error) {
      console.error('Error fetching item:', error);
      showToast('Failed to load item', 'error');
      navigate('/manage-inventory/view');
    } finally {
      setFetchLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const descValidation = validateItemDescription(formData.description);
    if (!descValidation.valid) {
      newErrors.description = descValidation.error;
    }

    const conditionValidation = validateCondition(formData.condition);
    if (!conditionValidation.valid) {
      newErrors.condition = conditionValidation.error;
    }

    // Allow all valid statuses for edit (including Checked out)
    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    const costValidation = validateCost(formData.cost);
    if (!costValidation.valid) {
      newErrors.cost = costValidation.error;
    }

    const notesValidation = validateNotes(formData.notes);
    if (!notesValidation.valid) {
      newErrors.notes = notesValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    try {
      setLoading(true);
      const updates = {
        description: formData.description.trim(),
        isTagged: item.isTagged, // Keep existing value
        condition: formData.condition,
        status: formData.status,
        purchaseDate: formData.purchaseDate || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        notes: formData.notes.trim(),
        inApp: formData.inApp
      };

      const response = await fetch(`${API_URL}/api/manage-inventory/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item');
      }

      showToast('Item updated successfully', 'success');
      setTimeout(() => {
        navigate('/manage-inventory/view');
      }, 1000);
    } catch (error) {
      console.error('Error updating item:', error);
      showToast(error.message || 'Failed to update item. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-scout-blue"></div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Header */}
      <div className="header">
        <Link
          to="/manage-inventory/view"
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1>Edit Item</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Form */}
      <div className="px-5 py-6 pb-32">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600">
              {item.itemDesc}
            </div>
            <p className="text-xs text-gray-500 mt-1">Category cannot be changed</p>
          </div>

          {/* Item ID (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item ID
            </label>
            <input
              type="text"
              value={item.itemId}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
              <span className="text-gray-500 text-xs ml-1">(max 50 chars)</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={50}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter item description"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Include in App */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="inApp"
              checked={formData.inApp}
              onChange={(e) => setFormData({ ...formData, inApp: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="inApp" className="ml-2 block text-sm text-gray-700">
              Include in app
            </label>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Condition <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-2">
              {['Usable', 'Not usable', 'Unknown'].map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setFormData({ ...formData, condition: cond })}
                  className={`flex-1 px-4 py-2 text-sm rounded-full border border-gray-300 touch-target transition-all duration-200 ${
                    formData.condition === cond
                      ? 'bg-scout-blue text-white border-scout-blue'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{
                    boxShadow: 'none !important',
                    textShadow: 'none !important',
                    filter: 'none !important',
                    outline: 'none !important',
                    borderStyle: 'solid',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none'
                  }}
                >
                  {cond}
                </button>
              ))}
            </div>
            {errors.condition && (
              <p className="text-red-500 text-sm mt-1">{errors.condition}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Status <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['In shed', 'Missing', 'Out for repair', 'Checked out'].map((stat) => (
                <button
                  key={stat}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: stat })}
                  className={`px-4 py-2 text-sm rounded-full border border-gray-300 touch-target transition-all duration-200 ${
                    formData.status === stat
                      ? 'bg-scout-blue text-white border-scout-blue'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{
                    boxShadow: 'none !important',
                    textShadow: 'none !important',
                    filter: 'none !important',
                    outline: 'none !important',
                    borderStyle: 'solid',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none'
                  }}
                >
                  {stat}
                </button>
              ))}
            </div>
            {errors.status && (
              <p className="text-red-500 text-sm mt-1">{errors.status}</p>
            )}
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Date <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.cost ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="$0.00"
            />
            {errors.cost && (
              <p className="text-red-500 text-sm mt-1">{errors.cost}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes <span className="text-gray-500">(optional, max 200 chars)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              maxLength={200}
              rows={2}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.notes ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Additional notes"
            />
            {errors.notes && (
              <p className="text-red-500 text-sm mt-1">{errors.notes}</p>
            )}
          </div>

        </form>
        
        {/* Spacer for sticky bottom bar */}
        <div style={{ height: '80px' }}></div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50" style={{width: '100vw'}}>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => navigate('/manage-inventory/view')}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 min-h-[44px] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-scout-blue text-white rounded-lg hover:bg-scout-blue/90 min-h-[44px] disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditItem;

