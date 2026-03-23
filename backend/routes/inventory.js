const express = require('express');
const router = express.Router();
const supabaseAPI = require('../services/supabase-api');

// GET /api/inventory - Get all inventory
router.get('/', async (req, res) => {
  try {
    const inventory = await supabaseAPI.getInventory();
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/categories - Get all categories with counts
router.get('/categories', async (req, res) => {
  try {
    const categories = await supabaseAPI.getCategoriesWithItemDescriptions();
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
    const items = await supabaseAPI.getItemsByCategory(category);
    res.json(items);
  } catch (error) {
    console.error('Error fetching items by category:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/inventory/outings - Get outings with checked out items
router.get('/outings', async (req, res) => {
  try {
    const outings = await supabaseAPI.getOutingsWithItems();

    const allOutingsFromTransactions = await supabaseAPI.getAllOutingsFromTransactions();
    const transactionCountMap = new Map(
      allOutingsFromTransactions.map(o => [o.outingName, o.transactionCount])
    );

    const enrichedOutings = outings.map(outing => ({
      ...outing,
      transactionCount: transactionCountMap.get(outing.outingName) || 0,
    }));

    res.json(enrichedOutings);
  } catch (error) {
    console.error('Error fetching outings:', error);
    res.status(500).json({ error: 'Failed to fetch outings' });
  }
});

// GET /api/inventory/checked-out/:outing - Get checked out items for specific outing
router.get('/checked-out/:outing', async (req, res) => {
  try {
    const { outing } = req.params;
    const items = await supabaseAPI.getCheckedOutItemsByOuting(outing);
    res.json(items);
  } catch (error) {
    console.error('Error fetching checked out items:', error);
    res.status(500).json({ error: 'Failed to fetch checked out items' });
  }
});

// GET /api/inventory/outing-details/:outing - Get outing details
router.get('/outing-details/:outing', async (req, res) => {
  try {
    const { outing } = req.params;
    const details = await supabaseAPI.getOutingDetails(outing);
    if (details) {
      res.json(details);
    } else {
      res.status(404).json({ error: 'Outing not found' });
    }
  } catch (error) {
    console.error('Error fetching outing details:', error);
    res.status(500).json({ error: 'Failed to fetch outing details' });
  }
});

module.exports = router;
