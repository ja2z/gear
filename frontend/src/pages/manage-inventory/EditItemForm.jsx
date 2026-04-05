import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useInventory } from '../../hooks/useInventory';
import { formatDate } from '../../utils/dateFormatting';
import {
  validateItemDescription,
  validateCost,
  validateCondition,
  validateNotes,
} from '../../utils/validation';
import { costToFormString, parseCostFromRaw } from '../../utils/parseCost';
import { getApiBaseUrl } from '../../config/apiBaseUrl';

function EditItemForm({
  itemId,
  isModal = false,
  onClose,
  onSuccess,
  returnState = null,
}) {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const { getData } = useInventory();

  const [item, setItem] = useState(null);
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
  const [fetchLoading, setFetchLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    (async () => {
      try {
        setFetchLoading(true);
        const data = await getData(`/manage-inventory/items/${itemId}`);
        if (cancelled) return;
        setItem(data);
        setFormData({
          description: data.description || '',
          inApp: data.inApp,
          condition: data.condition || '',
          status: data.status || '',
          purchaseDate: data.purchaseDate || '',
          cost: costToFormString(data.cost),
          notes: data.notes || '',
        });
      } catch (error) {
        console.error('Error fetching item:', error);
        showToast('Failed to load item', 'error');
        if (onClose) onClose();
        else navigate('/manage-inventory/view', { state: returnState });
      } finally {
        if (!cancelled) setFetchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId, getData, showToast, onClose, navigate, returnState]);

  const validateForm = () => {
    const newErrors = {};
    const descValidation = validateItemDescription(formData.description);
    if (!descValidation.valid) newErrors.description = descValidation.error;
    const conditionValidation = validateCondition(formData.condition);
    if (!conditionValidation.valid) newErrors.condition = conditionValidation.error;
    if (!formData.status) newErrors.status = 'Status is required';
    const costValidation = validateCost(formData.cost);
    if (!costValidation.valid) newErrors.cost = costValidation.error;
    const notesValidation = validateNotes(formData.notes);
    if (!notesValidation.valid) newErrors.notes = notesValidation.error;
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
        isTagged: item.isTagged,
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
      const response = await fetch(`${getApiBaseUrl()}/manage-inventory/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item');
      }
      showToast('Item updated successfully', 'success');
      if (onSuccess) {
        await Promise.resolve(onSuccess());
      } else {
        setTimeout(() => navigate('/manage-inventory/view', { state: returnState }), 1000);
      }
    } catch (error) {
      console.error('Error updating item:', error);
      showToast(error.message || 'Failed to update item. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-scout-blue" />
      </div>
    );
  }

  if (!item) {
    return null;
  }

  const formPadding = isModal ? 'space-y-4 px-4 py-3' : 'space-y-5';
  const labelMb = isModal ? 'mb-1' : 'mb-2';

  const formInner = (
      <form id="edit-item-form" onSubmit={handleSubmit} className={formPadding}>
        <div>
          <label className={`block text-sm font-medium text-gray-700 ${labelMb}`}>Category</label>
          <div className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-600">
            {item.itemDesc}
          </div>
          <p className="mt-1 text-xs text-gray-500">Category cannot be changed</p>
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 ${labelMb}`}>Item ID</label>
          <input
            type="text"
            value={item.itemId}
            disabled
            className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-600"
          />
        </div>

        <div>
          <Link
            to={`/manage-inventory/item-log/${itemId}`}
            state={{ editItemId: itemId }}
            className="flex min-h-[44px] w-full items-center justify-center space-x-2 rounded-lg bg-gray-200 px-4 py-3 text-gray-800 no-underline transition-colors hover:bg-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>View Item Log</span>
          </Link>
        </div>

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
            id="inApp-edit"
            checked={formData.inApp}
            onChange={(e) => setFormData({ ...formData, inApp: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="inApp-edit" className="ml-2 block text-sm text-gray-700">
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
          <div className="grid grid-cols-2 gap-2">
            {['In shed', 'Reserved', 'Missing', 'Out for repair', 'Checked out'].map((stat) => (
              <button
                key={stat}
                type="button"
                onClick={() => setFormData({ ...formData, status: stat })}
                className={`rounded-full border-2 border-[#d1d5db] px-4 py-2 text-sm touch-target transition-all duration-200 ${
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

          {item.status === 'Checked out' && item.checkedOutTo && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-gray-800">
                <span className="font-medium">Checked out to:</span> {item.checkedOutTo}
                {item.checkOutDate && (
                  <span className="mt-1 block">
                    <span className="font-medium">On:</span> {formatDate(item.checkOutDate)}
                  </span>
                )}
                {item.outingName && (
                  <span className="mt-1 block">
                    <span className="font-medium">For:</span> {item.outingName}
                  </span>
                )}
              </p>
            </div>
          )}

          {item.status === 'Reserved' && item.outingName && (
            <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="text-sm text-gray-800">
                <span className="font-medium">Reserved for:</span> {item.outingName}
              </p>
            </div>
          )}
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
            : 'border-t border-gray-200 bg-white p-4'
        }
      >
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() =>
              onClose ? onClose() : navigate('/manage-inventory/view', { state: returnState })
            }
            disabled={loading}
            className="min-h-[44px] flex-1 rounded-lg bg-gray-200 px-4 py-3 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-item-form"
            disabled={loading}
            className="btn-primary-pill flex-1"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
  );

  const body = (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      {formInner}
      {footer}
    </>
  );

  if (isModal) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
          {formInner}
        </div>
        {footer}
      </div>
    );
  }

  return body;
}

export default EditItemForm;
