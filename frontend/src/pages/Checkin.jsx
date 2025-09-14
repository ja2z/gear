import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';

const Checkin = () => {
  const { postData, loading } = useInventory();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [submitError, setSubmitError] = useState(null);

  // Mock data for checked out items - in real app, this would come from API
  const checkedOutItems = [
    { itemId: 'TENT-001', description: 'Zephyr 3', checkedOutTo: 'John Smith', outingName: 'Fall Camping' },
    { itemId: 'SLEEP-001', description: 'Mummy Bag', checkedOutTo: 'Jane Doe', outingName: 'Fall Camping' },
    { itemId: 'COOK-001', description: 'Camp Stove', checkedOutTo: 'Bob Johnson', outingName: 'Winter Trip' },
  ];

  const filteredItems = checkedOutItems.filter(item =>
    item.itemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.checkedOutTo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemSelect = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.itemId === item.itemId);
      if (exists) {
        return prev.filter(i => i.itemId !== item.itemId);
      } else {
        return [...prev, { ...item, condition: 'Usable' }];
      }
    });
  };

  const handleConditionChange = (itemId, condition) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.itemId === itemId ? { ...item, condition } : item
      )
    );
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      setSubmitError('Please select at least one item to check in.');
      return;
    }

    setSubmitError(null);

    try {
      const itemIds = selectedItems.map(item => item.itemId);
      const conditions = selectedItems.map(item => item.condition);
      
      const checkinData = {
        itemIds,
        conditions,
        processedBy: 'System User', // TODO: Get from auth context
        notes: 'Checked in via mobile app'
      };

      const result = await postData('/checkin', checkinData);
      
      if (result.success) {
        navigate('/success');
      } else {
        setSubmitError(result.message || 'Checkin failed');
      }
    } catch (error) {
      console.error('Checkin error:', error);
      setSubmitError('Failed to process checkin. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link
          to="/"
          className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white text-lg"
        >
          ←
        </Link>
        <h1>Check In Gear</h1>
      </div>

      {/* Search */}
      <div className="bg-white px-5 py-4 border-b border-gray-200 sticky top-0 z-10">
        <input
          type="text"
          placeholder="Search checked out items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Items List */}
      <div className="px-5 py-5 pb-20">
        <div className="space-y-3 mb-6">
          {filteredItems.map((item) => {
            const isSelected = selectedItems.find(i => i.itemId === item.itemId);
            return (
              <div
                key={item.itemId}
                className={`card ${
                  isSelected ? 'card-selected' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleItemSelect(item)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center touch-target ${
                          isSelected ? 'bg-scout-blue border-scout-blue text-white' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <span className="text-sm">✓</span>}
                      </button>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.itemId}
                        </h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <p className="text-xs text-gray-500">
                          Checked out to: {item.checkedOutTo} • {item.outingName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Condition:
                    </label>
                    <div className="flex space-x-2">
                      {['Usable', 'Not usable', 'Missing'].map((condition) => (
                        <button
                          key={condition}
                          onClick={() => handleConditionChange(item.itemId, condition)}
                          className={`px-3 py-1 text-sm rounded-full border touch-target ${
                            isSelected.condition === condition
                              ? 'bg-scout-blue text-white border-scout-blue'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {condition}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No checked out items found matching your search.</p>
          </div>
        )}

        {/* Error Display */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{submitError}</p>
          </div>
        )}

        {/* Submit Button */}
        {selectedItems.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full btn-primary py-4 text-lg touch-target disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : `Check In ${selectedItems.length} Item${selectedItems.length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
};

export default Checkin;
