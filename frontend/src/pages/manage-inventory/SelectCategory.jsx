import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useInventory } from '../../hooks/useInventory';
import { AnimateMain } from '../../components/AnimateMain';
import HeaderProfileMenu from '../../components/HeaderProfileMenu';
import useIsDesktop from '../../hooks/useIsDesktop';
import { useDesktopHeader } from '../../context/DesktopHeaderContext';

const SelectCategory = () => {
  const navigate = useNavigate();
  const { getData } = useInventory();
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const isDesktop = useIsDesktop();

  useDesktopHeader({ title: 'Select Category' });

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
    navigate('/manage-inventory/view', {
      state: { openAddItem: true, selectedCategory: category },
    });
  };

  return (
    <div className={isDesktop ? '' : 'h-screen-small flex flex-col bg-gray-100'}>
      {!isDesktop && (
        <div className="header">
          <Link
            to="/manage-inventory/view"
            state={{ openAddItem: true }}
            className="back-button no-underline"
          >
            ←
          </Link>
          <h1>Select Category</h1>
          <HeaderProfileMenu />
        </div>
      )}

      <AnimateMain className={isDesktop ? '' : 'flex flex-1 flex-col min-h-0'}>
      <div className={isDesktop ? 'py-4' : 'bg-white px-5 py-4 border-b border-gray-200'}>
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className={isDesktop ? '' : 'flex-1 overflow-y-auto'}>
        <div className={isDesktop ? 'py-4' : 'px-4 py-4'}>
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
      </AnimateMain>
    </div>
  );
};

export default SelectCategory;
