import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useInventory } from '../../hooks/useInventory';
import { validateCategoryName } from '../../utils/validation';

const EditCategory = () => {
  const navigate = useNavigate();
  const { classCode } = useParams();
  const { toast, showToast, hideToast } = useToast();
  const { getData } = useInventory();

  const [category, setCategory] = useState(null);
  const [classDesc, setClassDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategory();
  }, [classCode]);

  const fetchCategory = async () => {
    try {
      setFetchLoading(true);
      const data = await getData('/metadata/categories');
      
      const found = data.find(cat => cat.class === classCode);
      if (!found) {
        throw new Error('Category not found');
      }
      
      setCategory(found);
      setClassDesc(found.class_desc);
    } catch (error) {
      console.error('Error fetching category:', error);
      showToast('Failed to load category', 'error');
      navigate('/manage-inventory/categories');
    } finally {
      setFetchLoading(false);
    }
  };

  const validateForm = async () => {
    const newErrors = {};

    const nameValidation = validateCategoryName(classDesc);
    if (!nameValidation.valid) {
      newErrors.classDesc = nameValidation.error;
    }

    // Check uniqueness on server (excluding current category)
    if (!newErrors.classDesc) {
      try {
        const data = await getData(
          `/metadata/categories/check-unique?classDesc=${encodeURIComponent(classDesc)}&excludeClass=${classCode}`
        );
        
        if (!data.classDescUnique) {
          newErrors.classDesc = 'Category name already exists';
        }
      } catch (error) {
        console.error('Error checking uniqueness:', error);
        newErrors.general = 'Failed to validate category';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Use custom fetch since useInventory doesn't have a PUT method helper
      const API_BASE_URL = import.meta.env.PROD 
        ? (import.meta.env.VITE_API_URL || 'https://gear-backend.onrender.com/api')
        : '/api';
      
      const response = await fetch(`${API_BASE_URL}/metadata/categories/${classCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ classDesc: classDesc.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update category');
      }

      showToast('Category updated successfully', 'success');
      setTimeout(() => {
        navigate('/manage-inventory/categories');
      }, 1000);
    } catch (error) {
      console.error('Error updating category:', error);
      showToast(error.message || 'Failed to update category. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-scout-blue"></div>
      </div>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Header */}
      <div className="header">
        <Link
          to="/manage-inventory/categories"
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1>Edit Category</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Form */}
      <div className="px-5 py-6 pb-24">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category Code (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Code
            </label>
            <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600">
              {category.class}
            </div>
            <p className="text-xs text-gray-500 mt-1">Category code cannot be changed</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name <span className="text-red-500">*</span>
              <span className="text-gray-500 text-xs ml-1">(max 22 chars)</span>
            </label>
            <input
              type="text"
              value={classDesc}
              onChange={(e) => setClassDesc(e.target.value)}
              maxLength={22}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.classDesc ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Bear Can"
            />
            {errors.classDesc && (
              <p className="text-red-500 text-sm mt-1">{errors.classDesc}</p>
            )}
          </div>

        </form>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50" style={{width: '100vw'}}>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => navigate('/manage-inventory/categories')}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 min-h-[44px] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-scout-blue text-white rounded-lg hover:bg-scout-blue/90 min-h-[44px] disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCategory;

