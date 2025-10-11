import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useInventory } from '../../hooks/useInventory';

const SelectCategory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getData } = useInventory();
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getData('/metadata/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.class_desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategorySelect = (category) => {
    navigate('/manage-inventory/add-item', { 
      state: { selectedCategory: category } 
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <Link
          to="/manage-inventory/add-item"
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1>Select Category</h1>
        <div className="w-10 h-10"></div>
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
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-scout-blue"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCategories.map((cat) => (
              <div
                key={cat.class}
                onClick={() => handleCategorySelect(cat)}
                className="bg-white rounded-lg shadow-xs p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{cat.class_desc}</span>
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

export default SelectCategory;

