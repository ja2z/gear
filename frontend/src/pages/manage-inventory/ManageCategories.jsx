import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// Configure API base URL based on environment
const API_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || 'https://gear-backend.onrender.com')
  : 'http://localhost:3001';

const ManageCategories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/metadata/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.class_desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link
          to="/manage-inventory"
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1>Manage Categories</h1>
        <Link
          to="/manage-inventory/add-category"
          className="cart-badge no-underline"
          aria-label="Add category"
        >
          <svg class="add-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white px-5 py-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Content */}
      <div className="px-5 py-5 pb-20">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-scout-blue"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCategories.map((cat) => (
              <div
                key={cat.class}
                onClick={() => navigate(`/manage-inventory/edit-category/${cat.class}`)}
                className="card touch-target block cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-gray-900">{cat.class_desc}</span>
                    <span className="text-gray-500 text-sm ml-2">({cat.class})</span>
                  </div>
                  <span className="text-gray-400 text-xl">›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageCategories;

