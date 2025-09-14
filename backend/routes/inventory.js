const express = require('express');
const router = express.Router();
const sheetsAPI = require('../services/sheets-api');

// GET /api/inventory - Get all inventory
router.get('/', async (req, res) => {
  try {
    const inventory = await sheetsAPI.getInventory();
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/categories - Get all categories with counts
router.get('/categories', async (req, res) => {
  try {
    const categories = await sheetsAPI.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/inventory/items/:category - Get items by category
router.get('/items/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const items = await sheetsAPI.getItemsByCategory(category);
    res.json(items);
  } catch (error) {
    console.error('Error fetching items by category:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

module.exports = router;
