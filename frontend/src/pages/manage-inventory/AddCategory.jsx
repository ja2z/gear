import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { validateCategoryCode, validateCategoryName } from '../../utils/validation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AddCategory = () => {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const [formData, setFormData] = useState({
    class: '',
    classDesc: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = async () => {
    const newErrors = {};

    const codeValidation = validateCategoryCode(formData.class);
    if (!codeValidation.valid) {
      newErrors.class = codeValidation.error;
    }

    const nameValidation = validateCategoryName(formData.classDesc);
    if (!nameValidation.valid) {
      newErrors.classDesc = nameValidation.error;
    }

    // Check uniqueness on server
    if (!newErrors.class && !newErrors.classDesc) {
      try {
        const response = await fetch(
          `${API_URL}/api/metadata/categories/check-unique?class=${encodeURIComponent(formData.class)}&classDesc=${encodeURIComponent(formData.classDesc)}`
        );
        const data = await response.json();
        
        if (!data.classUnique) {
          newErrors.class = 'Category code already exists';
        }
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
      const categoryData = {
        class: formData.class.toUpperCase().trim(),
        classDesc: formData.classDesc.trim()
      };

      const response = await fetch(`${API_URL}/api/metadata/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create category');
      }

      showToast('Category created successfully', 'success');
      setTimeout(() => {
        navigate('/manage-inventory/categories');
      }, 1000);
    } catch (error) {
      console.error('Error creating category:', error);
      showToast(error.message || 'Failed to create category. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
        <h1>Add New Category</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Form */}
      <div className="px-5 py-6 pb-24">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Code <span className="text-red-500">*</span>
              <span className="text-gray-500 text-xs ml-1">(uppercase, max 5 chars)</span>
            </label>
            <input
              type="text"
              value={formData.class}
              onChange={(e) => setFormData({ ...formData, class: e.target.value.toUpperCase() })}
              maxLength={5}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase ${
                errors.class ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="BRCAN"
            />
            {errors.class && (
              <p className="text-red-500 text-sm mt-1">{errors.class}</p>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name <span className="text-red-500">*</span>
              <span className="text-gray-500 text-xs ml-1">(max 22 chars)</span>
            </label>
            <input
              type="text"
              value={formData.classDesc}
              onChange={(e) => setFormData({ ...formData, classDesc: e.target.value })}
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
            {loading ? 'Creating...' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCategory;

