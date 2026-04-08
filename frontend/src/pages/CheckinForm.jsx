import { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { useAuth } from '../context/AuthContext';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';

const CheckinForm = () => {
  const { postData, loading } = useInventory();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();

  useDesktopHeader({ title: 'Check In Information' });

  const { selectedItems, selectedOuting } = location.state || {};

  const userFullName = user ? `${user.first_name} ${user.last_name}` : '';

  const [formData, setFormData] = useState({
    qmName: userFullName
  });
  const [submitError, setSubmitError] = useState(null);

  const groupedItems = useMemo(() => {
    if (!selectedItems) return {};
    const grouped = {};
    selectedItems.forEach(item => {
      const key = item.itemClass || 'Other';
      if (!grouped[key]) {
        grouped[key] = { description: item.itemDesc || key, items: [] };
      }
      grouped[key].items.push(item);
    });
    Object.values(grouped).forEach(cat =>
      cat.items.sort((a, b) => (a.itemNum || 0) - (b.itemNum || 0))
    );
    return grouped;
  }, [selectedItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.qmName.trim()) {
      setSubmitError('Please enter your name');
      return;
    }

    if (!selectedItems || selectedItems.length === 0) {
      setSubmitError('No items selected for checkin');
      return;
    }

    try {
      const itemIds = selectedItems.map(item => item.itemId);
      const conditions = selectedItems.map(item => item.condition);
      
      const checkinData = {
        itemIds,
        conditions,
        processedBy: formData.qmName.trim(),
        notes: ''
      };

      const result = await postData('/checkin', checkinData);
      
      if (result.success) {
        navigate(`/success?action=checkin&count=${selectedItems.length}`);
      } else {
        setSubmitError(result.message || 'Checkin failed');
      }
    } catch (error) {
      console.error('Checkin error:', error);
      setSubmitError('Failed to process checkin. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!selectedItems || selectedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No items selected</h2>
          <Link
            to="/checkin"
            className="inline-block bg-scout-blue/12 border border-scout-blue/20 text-scout-blue px-6 py-3 rounded-lg hover:bg-scout-blue/18 transition-colors touch-target no-underline"
          >
            Select Items
          </Link>
        </div>
      </div>
    );
  }

  const formContent = (
    <>
      <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200 lg:hidden">
        <h2 className="text-lg font-semibold text-gray-900 text-center">
          Checking In {selectedItems.length} Item{selectedItems.length > 1 ? 's' : ''}
        </h2>
      </div>

      <form id="checkin-form" onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="qmName" className="block text-sm font-semibold text-gray-700 mb-2">
            Your Name (QM) *
          </label>
          <input
            type="text"
            id="qmName"
            name="qmName"
            value={formData.qmName}
            onChange={handleChange}
            required
            disabled={!!user}
            className={`form-input${user ? ' bg-gray-50 text-gray-500 cursor-not-allowed opacity-60' : ''}`}
            placeholder="Enter quartermaster name"
          />
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{submitError}</p>
          </div>
        )}

        {isDesktop && (
          <button
            type="submit"
            disabled={loading || !formData.qmName.trim()}
            className="w-full h-12 text-base font-medium rounded-md bg-scout-blue/12 border border-scout-blue/20 text-scout-blue disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Complete Check In (${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''})`}
          </button>
        )}
      </form>
    </>
  );

  const itemsSummaryCard = (
    <div className="sticky top-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Items to Check In
            <span className="ml-2 text-sm font-normal text-gray-500">
              {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
            </span>
          </h2>
        </div>
        <div className="px-5 py-3 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {Object.entries(groupedItems).map(([classCode, group]) => (
            <div key={classCode} className="py-2 first:pt-0 last:pb-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {group.description}
                <span className="ml-1 text-gray-400">({group.items.length})</span>
              </p>
              <ul className="space-y-0.5">
                {group.items.map(item => (
                  <li key={item.itemId} className="text-sm text-gray-700 flex items-baseline gap-2">
                    <span className="font-medium text-scout-blue shrink-0">{item.itemId}</span>
                    {item.description && (
                      <span className="text-gray-500 truncate">{item.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ---- Desktop layout ---- */
  if (isDesktop) {
    return (
      <AnimateMain className="flex flex-1 flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 lg:grid lg:grid-cols-[1fr_22rem] lg:gap-6">
            <div>{formContent}</div>
            {itemsSummaryCard}
          </div>
        </div>
      </AnimateMain>
    );
  }

  /* ---- Mobile layout (unchanged) ---- */
  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <div className="header">
        <Link
          to="/checkin"
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1 className="text-center text-truncate">Check In Information</h1>
        <HeaderProfileMenu />
      </div>

      <AnimateMain className="flex flex-1 flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-6 pb-20">
          {formContent}
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <button
          type="submit"
          form="checkin-form"
          disabled={loading || !formData.qmName.trim()}
          onClick={handleSubmit}
          className="w-full h-12 text-base font-medium rounded-md bg-scout-blue/12 border border-scout-blue/20 text-scout-blue disabled:opacity-50"
        >
          {loading ? 'Processing...' : `Complete Check In (${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''})`}
        </button>
      </div>
      </AnimateMain>
    </div>
  );
};

export default CheckinForm;
