const express = require('express');
const router = express.Router();
const supabaseAPI = require('../services/supabase-api');

// GET /api/metadata/categories - Get all categories from metadata table
router.get('/categories', async (req, res) => {
  try {
    const categories = await supabaseAPI.getMetadataCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/metadata/categories/check-unique - Check category uniqueness
router.get('/categories/check-unique', async (req, res) => {
  try {
    const { class: classCode, classDesc, excludeClass } = req.query;
    const result = await supabaseAPI.checkCategoryUniqueness(
      classCode,
      classDesc,
      excludeClass || null
    );
    res.json(result);
  } catch (error) {
    console.error('Error checking category uniqueness:', error);
    res.status(500).json({ error: 'Failed to check category uniqueness' });
  }
});

// POST /api/metadata/categories - Add new category
router.post('/categories', async (req, res) => {
  try {
    const { class: classCode, classDesc } = req.body;

    if (!classCode || !classDesc) {
      return res.status(400).json({ error: 'Class and Class Desc are required' });
    }

    if (classCode.length > 5) {
      return res.status(400).json({ error: 'Class must be 5 characters or less' });
    }

    if (classDesc.length > 22) {
      return res.status(400).json({ error: 'Class Desc must be 22 characters or less' });
    }

    const uniqueness = await supabaseAPI.checkCategoryUniqueness(classCode, classDesc);
    if (!uniqueness.classUnique) {
      return res.status(400).json({ error: 'Category code already exists' });
    }
    if (!uniqueness.classDescUnique) {
      return res.status(400).json({ error: 'Category name already exists' });
    }

    const categoryData = {
      class: classCode.toUpperCase().trim(),
      classDesc: classDesc.trim(),
    };

    await supabaseAPI.addMetadataCategory(categoryData);

    res.json({ success: true, category: categoryData });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

// PUT /api/metadata/categories/:class - Update category (Class Desc only)
router.put('/categories/:class', async (req, res) => {
  try {
    const { class: classCode } = req.params;
    const { classDesc } = req.body;

    if (!classDesc) {
      return res.status(400).json({ error: 'Class Desc is required' });
    }

    if (classDesc.length > 22) {
      return res.status(400).json({ error: 'Class Desc must be 22 characters or less' });
    }

    const uniqueness = await supabaseAPI.checkCategoryUniqueness(null, classDesc, classCode);
    if (!uniqueness.classDescUnique) {
      return res.status(400).json({ error: 'Category name already exists' });
    }

    const newClassDesc = classDesc.trim();

    // updateCategory updates both metadata and all items' item_desc
    await supabaseAPI.updateCategory(classCode, newClassDesc);

    res.json({ success: true, category: { class: classCode, classDesc: newClassDesc } });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

module.exports = router;
