const express = require('express');
const router = express.Router();
const sheetsAPI = require('../services/sheets-api');
const sqliteAPI = require('../services/sqlite-api');

// Sync metadata from Google Sheets on route initialization
async function ensureMetadataSynced() {
  try {
    await sheetsAPI.syncMetadataFromSheets();
  } catch (error) {
    console.error('Error syncing metadata:', error);
    // Don't throw - allow routes to continue even if sync fails
  }
}

// Get all categories from metadata
router.get('/categories', async (req, res) => {
  try {
    // Sync from Sheets first
    await ensureMetadataSynced();
    
    // Then read from SQLite
    const categories = await sqliteAPI.getMetadataCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Check category uniqueness
router.get('/categories/check-unique', async (req, res) => {
  try {
    const { class: classCode, classDesc, excludeClass } = req.query;
    
    // Check in Google Sheets (source of truth)
    const result = await sheetsAPI.checkCategoryUniqueness(
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

// Add new category
router.post('/categories', async (req, res) => {
  try {
    const { class: classCode, classDesc } = req.body;
    
    // Validate input
    if (!classCode || !classDesc) {
      return res.status(400).json({ error: 'Class and Class Desc are required' });
    }
    
    // Validate format
    if (classCode.length > 5) {
      return res.status(400).json({ error: 'Class must be 5 characters or less' });
    }
    
    if (classDesc.length > 22) {
      return res.status(400).json({ error: 'Class Desc must be 22 characters or less' });
    }
    
    // Check uniqueness
    const uniqueness = await sheetsAPI.checkCategoryUniqueness(classCode, classDesc);
    if (!uniqueness.classUnique) {
      return res.status(400).json({ error: 'Category code already exists' });
    }
    if (!uniqueness.classDescUnique) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    
    const categoryData = {
      class: classCode.toUpperCase().trim(),
      classDesc: classDesc.trim()
    };
    
    // Sync to Google Sheets first (fail fast)
    await sheetsAPI.addCategory(categoryData);
    
    // Then update SQLite cache
    await sqliteAPI.addMetadataCategory(categoryData);
    
    res.json({ success: true, category: categoryData });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

// Update category (Class Desc only)
router.put('/categories/:class', async (req, res) => {
  try {
    const { class: classCode } = req.params;
    const { classDesc } = req.body;
    
    // Validate input
    if (!classDesc) {
      return res.status(400).json({ error: 'Class Desc is required' });
    }
    
    if (classDesc.length > 22) {
      return res.status(400).json({ error: 'Class Desc must be 22 characters or less' });
    }
    
    // Check uniqueness (excluding current class)
    const uniqueness = await sheetsAPI.checkCategoryUniqueness(null, classDesc, classCode);
    if (!uniqueness.classDescUnique) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    
    const newClassDesc = classDesc.trim();
    
    // Sync to Google Sheets first (fail fast)
    await sheetsAPI.updateCategory(classCode, newClassDesc);
    
    // Then update SQLite cache
    await sqliteAPI.updateMetadataCategory(classCode, newClassDesc);
    
    res.json({ success: true, category: { class: classCode, classDesc: newClassDesc } });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

module.exports = router;

