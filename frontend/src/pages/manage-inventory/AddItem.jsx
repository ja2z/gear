import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useInventory } from '../../hooks/useInventory';
import {
  validateItemDescription,
  validateCost,
  validateCondition,
  validateStatus,
  validateNotes
} from '../../utils/validation';

const AddItem = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, showToast, hideToast } = useToast();
  const { getData, postData } = useInventory();

  const [selectedCategory, setSelectedCategory] = useState(location.state?.selectedCategory || null);
  const [nextItemNum, setNextItemNum] = useState('');
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
  const [errors, setErrors] = useState({});

  // Fetch next item number when category is selected
  useEffect(() => {
    if (selectedCategory) {
      fetchNextItemNum();
    }
  }, [selectedCategory]);

  const fetchNextItemNum = async () => {
    try {
      const data = await getData(`/manage-inventory/next-item-num/${selectedCategory.class}`);
      setNextItemNum(data.nextNum);
    } catch (error) {
      console.error('Error fetching next item number:', error);
      showToast('Failed to generate item number', 'error');
    }
  };

  const handleCategorySelect = () => {
    navigate('/manage-inventory/select-category');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!selectedCategory) {
      newErrors.category = 'Category is required';
    }

    const descValidation = validateItemDescription(formData.description);
    if (!descValidation.valid) {
      newErrors.description = descValidation.error;
    }

    const conditionValidation = validateCondition(formData.condition);
    if (!conditionValidation.valid) {
      newErrors.condition = conditionValidation.error;
    }

    const statusValidation = validateStatus(formData.status);
    if (!statusValidation.valid) {
      newErrors.status = statusValidation.error;
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
      const itemData = {
        itemClass: selectedCategory.class,
        itemDesc: selectedCategory.class_desc,
        itemNum: nextItemNum,
        itemId: `${selectedCategory.class}-${nextItemNum}`,
        description: formData.description.trim(),
        isTagged: false, // Default for new items
        condition: formData.condition,
        status: formData.status,
        purchaseDate: formData.purchaseDate || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        notes: formData.notes.trim(),
        inApp: formData.inApp
      };

      await postData('/manage-inventory/items', itemData);

      showToast('Item added successfully', 'success');
      setTimeout(() => {
        navigate('/manage-inventory');
      }, 1000);
    } catch (error) {
      console.error('Error adding item:', error);
      showToast(error.message || 'Failed to add item. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Header */}
      <div className="header">
        <Link
          to="/manage-inventory"
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1>Add New Item</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Form */}
      <div className="px-5 py-6 pb-32">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Category <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleCategorySelect}
              className={`w-full px-4 py-3 border rounded-lg text-left flex justify-between items-center ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <span className={selectedCategory ? 'text-gray-900' : 'text-gray-500'}>
                {selectedCategory ? selectedCategory.class_desc : 'Choose a category'}
              </span>
              <span className="text-gray-400">›</span>
            </button>
            {errors.category && (
              <p className="text-red-500 text-sm mt-1">{errors.category}</p>
            )}
          </div>

          {/* Item ID (Auto-generated) */}
          {selectedCategory && nextItemNum && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item ID
              </label>
              <input
                type="text"
                value={`${selectedCategory.class}-${nextItemNum}`}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
          )}

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
            <div className="flex space-x-2">
              {['In shed', 'Missing', 'Out for repair'].map((stat) => (
                <button
                  key={stat}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: stat })}
                  className={`flex-1 px-4 py-2 text-sm rounded-full border border-gray-300 touch-target transition-all duration-200 ${
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
            onClick={() => navigate('/manage-inventory')}
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
            {loading ? 'Saving...' : 'Save Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddItem;

