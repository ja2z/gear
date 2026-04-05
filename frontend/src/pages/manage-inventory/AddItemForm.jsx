import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { useInventory } from '../../hooks/useInventory';
import {
  validateItemDescription,
  validateCost,
  validateCondition,
  validateStatus,
  validateNotes,
} from '../../utils/validation';
import { parseCostFromRaw } from '../../utils/parseCost';

/**
 * Shared add-item fields for ViewInventory modal (and tests if needed).
 */
function AddItemForm({
  isModal = false,
  initialCategory = null,
  onClose,
  onSuccess,
  onOpenCategoryPicker,
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { getData, postData } = useInventory();

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [nextItemNum, setNextItemNum] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    inApp: true,
    condition: '',
    status: '',
    purchaseDate: '',
    cost: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (selectedCategory) {
      (async () => {
        try {
          const data = await getData(`/manage-inventory/next-item-num/${selectedCategory.class}`);
          setNextItemNum(data.nextNum);
        } catch (error) {
          console.error('Error fetching next item number:', error);
          showToast('Failed to generate item number', 'error');
        }
      })();
    }
  }, [selectedCategory, getData, showToast]);

  const handleCategorySelect = () => {
    if (onOpenCategoryPicker) {
      onOpenCategoryPicker();
    } else {
      navigate('/manage-inventory/select-category');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!selectedCategory) {
      newErrors.category = 'Category is required';
    }
    const descValidation = validateItemDescription(formData.description);
    if (!descValidation.valid) newErrors.description = descValidation.error;
    const conditionValidation = validateCondition(formData.condition);
    if (!conditionValidation.valid) newErrors.condition = conditionValidation.error;
    const statusValidation = validateStatus(formData.status);
    if (!statusValidation.valid) newErrors.status = statusValidation.error;
    const costValidation = validateCost(formData.cost);
    if (!costValidation.valid) newErrors.cost = costValidation.error;
    const notesValidation = validateNotes(formData.notes);
    if (!notesValidation.valid) newErrors.notes = notesValidation.error;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid =
    selectedCategory !== null &&
    formData.description.trim() !== '' &&
    formData.condition !== '' &&
    formData.status !== '';

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
        isTagged: false,
        condition: formData.condition,
        status: formData.status,
        purchaseDate: formData.purchaseDate || null,
        cost: (() => {
          const v = typeof formData.cost === 'string' ? formData.cost.trim() : formData.cost;
          if (v === '' || v === null || v === undefined) return null;
          return parseCostFromRaw(formData.cost);
        })(),
        notes: formData.notes.trim(),
        inApp: formData.inApp,
      };
      await postData('/manage-inventory/items', itemData);
      showToast('Item added successfully', 'success');
      if (onSuccess) {
        await Promise.resolve(onSuccess());
      } else {
        setTimeout(() => navigate('/manage-inventory/view'), 1000);
      }
    } catch (error) {
      console.error('Error adding item:', error);
      showToast(error.message || 'Failed to add item. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formPadding = isModal ? 'space-y-4 px-4 py-3' : 'space-y-5';
  const labelMb = isModal ? 'mb-1' : 'mb-2';

  const formInner = (
    <form id="add-item-form" onSubmit={handleSubmit} className={formPadding}>
        <div>
          <label className={`block text-sm font-medium text-gray-700 ${labelMb}`}>
            Select Category <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={handleCategorySelect}
            className={`flex w-full items-center justify-between rounded-lg border bg-white px-4 py-3 text-left ${
              errors.category ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <span className={selectedCategory ? 'text-gray-900' : 'text-gray-500'}>
              {selectedCategory ? selectedCategory.class_desc : 'Choose a category'}
            </span>
            <span className="text-gray-400">›</span>
          </button>
          {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
        </div>

        {selectedCategory && nextItemNum && (
          <div>
            <label className={`block text-sm font-medium text-gray-700 ${labelMb}`}>Item ID</label>
            <input
              type="text"
              value={`${selectedCategory.class}-${nextItemNum}`}
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-600"
            />
          </div>
        )}

        <div>
          <label className={`block text-sm font-medium text-gray-700 ${labelMb}`}>
            Description <span className="text-red-500">*</span>
            <span className="ml-1 text-xs text-gray-500">(max 50 chars)</span>
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={50}
            className={`w-full rounded-lg border bg-white px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter item description"
          />
          {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="inApp-add"
            checked={formData.inApp}
            onChange={(e) => setFormData({ ...formData, inApp: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="inApp-add" className="ml-2 block text-sm text-gray-700">
            Include in app
          </label>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700">
            Condition <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-2">
            {['Usable', 'Not usable', 'Unknown'].map((cond) => (
              <button
                key={cond}
                type="button"
                onClick={() => setFormData({ ...formData, condition: cond })}
                className={`flex-1 rounded-full border-2 border-[#d1d5db] px-4 py-2 text-sm touch-target transition-all duration-200 ${
                  formData.condition === cond
                    ? '!border-scout-blue !bg-scout-blue/12 text-scout-blue'
                    : '!bg-white text-gray-900 hover:bg-gray-50'
                }`}
                style={{
                  boxShadow: 'none',
                  textShadow: 'none',
                  filter: 'none',
                  outline: 'none',
                  borderStyle: 'solid',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                }}
              >
                {cond}
              </button>
            ))}
          </div>
          {errors.condition && <p className="mt-1 text-sm text-red-500">{errors.condition}</p>}
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700">
            Status <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-2">
            {['In shed', 'Missing', 'Out for repair'].map((stat) => (
              <button
                key={stat}
                type="button"
                onClick={() => setFormData({ ...formData, status: stat })}
                className={`flex-1 rounded-full border-2 border-[#d1d5db] px-4 py-2 text-sm touch-target transition-all duration-200 ${
                  formData.status === stat
                    ? '!border-scout-blue !bg-scout-blue/12 text-scout-blue'
                    : '!bg-white text-gray-900 hover:bg-gray-50'
                }`}
                style={{
                  boxShadow: 'none',
                  textShadow: 'none',
                  filter: 'none',
                  outline: 'none',
                  borderStyle: 'solid',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                }}
              >
                {stat}
              </button>
            ))}
          </div>
          {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 ${labelMb}`}>
            Purchase Date <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 ${labelMb}`}>
            Cost <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            className={`w-full rounded-lg border bg-white px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
              errors.cost ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0.00"
          />
          {errors.cost && <p className="mt-1 text-sm text-red-500">{errors.cost}</p>}
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 ${labelMb}`}>
            Notes <span className="text-gray-500">(optional, max 200 chars)</span>
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            maxLength={200}
            rows={2}
            className={`w-full rounded-lg border bg-white px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
              errors.notes ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Additional notes"
          />
          {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes}</p>}
        </div>
      </form>
  );

  const footer = (
      <div
        className={
          isModal
            ? 'shrink-0 border-t border-gray-200 bg-gray-100 px-4 py-3'
            : 'fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4'
        }
        style={isModal ? undefined : { width: '100vw' }}
      >
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => (onClose ? onClose() : navigate('/manage-inventory/view'))}
            disabled={loading}
            className="min-h-[44px] flex-1 rounded-lg bg-gray-200 px-4 py-3 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-item-form"
            disabled={loading || !isFormValid}
            className="btn-primary-pill flex-1"
          >
            {loading ? 'Saving...' : 'Save Item'}
          </button>
        </div>
      </div>
  );

  if (isModal) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">{formInner}</div>
        {footer}
      </div>
    );
  }

  return (
    <>
      {formInner}
      {footer}
    </>
  );
}

export default AddItemForm;
