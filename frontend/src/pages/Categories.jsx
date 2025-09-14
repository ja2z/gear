import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCategories } from '../hooks/useInventory';
import { ArrowLeft, Search, ShoppingCart } from 'lucide-react';

const Categories = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { getTotalItems } = useCart();
  const { categories, loading } = useCategories();

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

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
            
            <h1 className="text-xl font-bold text-gray-900">Gear Categories</h1>
            
            <Link
              to="/cart"
              className="relative flex items-center space-x-1 text-gray-600 hover:text-scout-blue touch-target"
            >
              <ShoppingCart className="w-6 h-6" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 bg-scout-blue text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent touch-target"
          />
        </div>
      </div>

      {/* Categories List */}
      <div className="container mx-auto px-4 pb-8">
        <div className="space-y-3">
          {filteredCategories.map((category) => (
            <Link
              key={category.name}
              to={`/items/${category.name}`}
              className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 touch-target"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {category.description}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {category.name} • {category.availableCount} of {category.totalCount} available
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-scout-blue">
                    {category.availableCount}
                  </div>
                  <div className="text-xs text-gray-500">available</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No categories found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
