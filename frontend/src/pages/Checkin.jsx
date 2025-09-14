import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { ArrowLeft, Search, CheckCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-scout-blue touch-target"
            >
              <ArrowLeft className="w-6 h-6" />
              <span className="font-medium">Back</span>
            </Link>
            
            <h1 className="text-xl font-bold text-gray-900">Check In Gear</h1>
            
            <div className="w-6"></div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search checked out items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent touch-target"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="container mx-auto px-4 pb-8">
        <div className="space-y-3 mb-6">
          {filteredItems.map((item) => {
            const isSelected = selectedItems.find(i => i.itemId === item.itemId);
            return (
              <div
                key={item.itemId}
                className={`bg-white rounded-lg p-4 shadow-sm border-2 transition-colors ${
                  isSelected ? 'border-scout-blue bg-blue-50' : 'border-transparent'
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
                        {isSelected && <CheckCircle className="w-4 h-4" />}
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
            className="w-full bg-scout-gold text-white py-4 rounded-lg hover:bg-yellow-600 transition-colors touch-target font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : `Check In ${selectedItems.length} Item${selectedItems.length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
};

export default Checkin;
