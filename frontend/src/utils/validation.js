// Category validation
export const validateCategoryCode = (code) => {
  if (!code || code.trim() === '') {
    return { valid: false, error: 'Category code is required' };
  }
  if (code.length > 5) {
    return { valid: false, error: 'Category code must be 5 characters or less' };
  }
  if (!/^[A-Z0-9]+$/.test(code)) {
    return { valid: false, error: 'Category code must be uppercase alphanumeric' };
  }
  return { valid: true };
};

export const validateCategoryName = (name) => {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Category name is required' };
  }
  if (name.length > 22) {
    return { valid: false, error: 'Category name must be 22 characters or less' };
  }
  return { valid: true };
};

// Item validation
export const validateItemDescription = (description) => {
  if (!description || description.trim() === '') {
    return { valid: false, error: 'Description is required' };
  }
  if (description.length > 50) {
    return { valid: false, error: 'Description must be 50 characters or less' };
  }
  return { valid: true };
};

export const validateCost = (cost) => {
  if (!cost || cost === '') {
    return { valid: true }; // Optional field
  }
  const numCost = parseFloat(cost);
  if (isNaN(numCost) || numCost <= 0) {
    return { valid: false, error: 'Cost must be greater than 0' };
  }
  // Check for max 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(cost.toString())) {
    return { valid: false, error: 'Cost must have at most 2 decimal places' };
  }
  return { valid: true };
};

export const validateCondition = (condition) => {
  if (!condition) {
    return { valid: false, error: 'Condition is required' };
  }
  if (!['Usable', 'Not usable', 'Unknown'].includes(condition)) {
    return { valid: false, error: 'Invalid condition value' };
  }
  return { valid: true };
};

export const validateStatus = (status) => {
  if (!status) {
    return { valid: false, error: 'Status is required' };
  }
  const validStatuses = ['In shed', 'Missing', 'Out for repair'];
  if (!validStatuses.includes(status)) {
    return { valid: false, error: 'Invalid status value' };
  }
  return { valid: true };
};

export const validateNotes = (notes) => {
  if (notes && notes.length > 200) {
    return { valid: false, error: 'Notes must be 200 characters or less' };
  }
  return { valid: true };
};

