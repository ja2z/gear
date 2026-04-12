import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { useAuth } from '../context/AuthContext';

/**
 * Confirm check-in from the check-in flow. processedBy comes from the signed-in user (field not shown).
 */
export default function CartCheckinModal({ open, onClose, selectedItems }) {
  const { postData, loading } = useInventory();
  const { user } = useAuth();
  const navigate = useNavigate();

  const userFullName = user ? `${user.first_name} ${user.last_name}` : '';

  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!open) setSubmitError(null);
  }, [open]);

  const groupedItems = useMemo(() => {
    if (!selectedItems?.length) return {};
    const grouped = {};
    selectedItems.forEach((item) => {
      const key = item.itemClass || 'Other';
      if (!grouped[key]) {
        grouped[key] = { description: item.itemDesc || key, items: [] };
      }
      grouped[key].items.push(item);
    });
    Object.values(grouped).forEach((cat) =>
      cat.items.sort((a, b) => (a.itemNum || 0) - (b.itemNum || 0))
    );
    return grouped;
  }, [selectedItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const processedBy = userFullName.trim();
    if (!processedBy) {
      setSubmitError('Could not determine who is processing check-in. Please sign in again.');
      return;
    }
    if (!selectedItems?.length) {
      setSubmitError('No items selected');
      return;
    }

    try {
      const itemIds = selectedItems
        .map((item) => (item?.itemId != null ? String(item.itemId).trim() : ''))
        .filter(Boolean);
      const conditions = selectedItems.map((item) => item?.condition || 'Usable');

      if (itemIds.length !== selectedItems.length) {
        setSubmitError('Some items are missing an ID. Go back and re-select items.');
        return;
      }

      const result = await postData('/checkin', {
        itemIds,
        conditions,
        processedBy,
        notes: '',
      });

      if (result.success) {
        onClose();
        navigate(`/success?action=checkin&count=${selectedItems.length}`);
        return;
      }

      const failedDetail =
        Array.isArray(result.failed) && result.failed.length > 0
          ? result.failed
              .map((f) => (f?.itemId ? `${f.itemId}: ${f.error || 'failed'}` : null))
              .filter(Boolean)
              .join(' · ')
          : '';
      setSubmitError(
        [result.message, failedDetail].filter(Boolean).join(' — ') || 'Check-in failed'
      );
    } catch (error) {
      console.error('Check-in error:', error);
      const msg =
        error?.message ||
        (typeof error === 'string' ? error : 'Failed to process check-in. Please try again.');
      setSubmitError(msg);
    }
  };

  if (!open || !selectedItems?.length) return null;

  return (
    <div
      className="modal-dialog-overlay-root select-none z-[140]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-checkin-modal-title"
    >
      <div
        role="presentation"
        aria-hidden
        className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter"
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div
          className="modal-dialog-panel-enter pointer-events-auto relative z-[141] flex max-h-[min(92dvh,44rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div className="min-w-0 flex-1 pr-2">
              <h2 id="cart-checkin-modal-title" className="text-lg font-bold text-gray-900">
                Confirm check-in
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="touch-target -mr-1 -mt-0.5 shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <form id="cart-checkin-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Items
                </p>
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {Object.entries(groupedItems).map(([classCode, group]) => (
                    <div key={classCode}>
                      <p className="text-xs text-gray-500">{group.description}</p>
                      <ul className="mt-0.5 space-y-0.5">
                        {group.items.map((item) => (
                          <li key={item.itemId} className="text-sm text-gray-800">
                            <span className="font-medium text-scout-green">{item.itemId}</span>
                            {item.description ? (
                              <span className="text-gray-600"> — {item.description}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-800">{submitError}</p>
                </div>
              )}
            </form>
          </div>

          <div className="shrink-0 border-t border-gray-200 px-5 py-4">
            <div className="flex flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-12 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="cart-checkin-form"
                disabled={loading || !userFullName.trim()}
                className="flex-1 min-h-12 rounded-md bg-scout-green text-base font-medium text-white disabled:opacity-50"
              >
                {loading ? 'Processing…' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
