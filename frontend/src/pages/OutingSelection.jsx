import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';

const OutingSelection = () => {
  const { getData, loading } = useInventory();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for outings with checked out items - in real app, this would come from API
  const outingsWithItems = [
    { 
      outingName: 'Fall Camping', 
      itemCount: 8,
      checkedOutDate: '2024-10-15'
    },
    { 
      outingName: 'Winter Trip', 
      itemCount: 12,
      checkedOutDate: '2024-11-20'
    },
    { 
      outingName: 'Spring Hiking', 
      itemCount: 6,
      checkedOutDate: '2024-12-01'
    },
    { 
      outingName: 'Summer Camp Prep', 
      itemCount: 15,
      checkedOutDate: '2024-12-10'
    }
  ];

  const filteredOutings = outingsWithItems.filter(outing =>
    outing.outingName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOutingSelect = (outingName) => {
    navigate(`/checkin/items?outing=${encodeURIComponent(outingName)}`);
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
        <h1>Select Outing</h1>
      </div>

      {/* Search */}
      <div className="bg-white px-5 py-4 border-b border-gray-200 sticky top-0 z-10">
        <input
          type="text"
          placeholder="Search outings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Outings List */}
      <div className="px-5 py-5">
        <div className="space-y-3">
          {filteredOutings.map((outing) => (
            <div
              key={outing.outingName}
              className="card cursor-pointer hover:shadow-card-hover transition-all"
              onClick={() => handleOutingSelect(outing.outingName)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {outing.outingName}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      📦 {outing.itemCount} item{outing.itemCount !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center">
                      📅 {new Date(outing.checkedOutDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredOutings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No outings found matching your search.</p>
          </div>
        )}

        {outingsWithItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No items are currently checked out.</p>
            <Link
              to="/"
              className="inline-block mt-4 btn-primary px-6 py-3 rounded-lg"
            >
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutingSelection;
