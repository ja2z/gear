const express = require('express');
const router = express.Router();
const sqliteAPI = require('../services/sqlite-api');
const sheetsAPI = require('../services/sheets-api');

// GET /api/inventory - Get all inventory
router.get('/', async (req, res) => {
  try {
    const inventory = await sqliteAPI.getInventory();
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/categories - Get all categories with counts
router.get('/categories', async (req, res) => {
  try {
    const { sync } = req.query;
    
    // Only sync from Google Sheets if explicitly requested (new session)
    if (sync === 'true') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🔄 Syncing from Google Sheets before fetching categories...`);
      console.log(`[${timestamp}] 📍 Called from: /api/inventory/categories endpoint`);
      try {
        await sheetsAPI.syncFromGoogleSheets();
        console.log(`[${timestamp}] ✅ Fresh data loaded from Google Sheets`);
      } catch (syncError) {
        console.warn(`[${timestamp}] ⚠️ Failed to sync from Google Sheets, using cached data:`, syncError.message);
        // Continue with cached data if sync fails
      }
    }
    
    // Get categories from SQLite (fresh data if synced, cached if not)
    const categories = await sqliteAPI.getCategoriesWithItemDescriptions();
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
    
    // Get items from SQLite cache (no sync needed - data is already fresh from categories page)
    const items = await sqliteAPI.getItemsByCategory(category);
    res.json(items);
  } catch (error) {
    console.error('Error fetching items by category:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/inventory/outings - Get outings with checked out items
router.get('/outings', async (req, res) => {
  try {
    const { sync } = req.query;
    
    // Only sync from Google Sheets if explicitly requested (new session)
    if (sync === 'true') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🔄 Syncing from Google Sheets before fetching outings...`);
      console.log(`[${timestamp}] 📍 Called from: /api/inventory/outings endpoint`);
      try {
        await sheetsAPI.syncFromGoogleSheets();
        console.log(`[${timestamp}] ✅ Fresh data loaded from Google Sheets`);
      } catch (syncError) {
        console.warn(`[${timestamp}] ⚠️ Failed to sync from Google Sheets, using cached data:`, syncError.message);
        // Continue with cached data if sync fails
      }
    }
    
    const outings = await sqliteAPI.getOutingsWithItems();
    res.json(outings);
  } catch (error) {
    console.error('Error fetching outings:', error);
    res.status(500).json({ error: 'Failed to fetch outings' });
  }
});

// GET /api/inventory/checked-out/:outing - Get checked out items for specific outing
router.get('/checked-out/:outing', async (req, res) => {
  try {
    const { outing } = req.params;
    const items = await sqliteAPI.getCheckedOutItemsByOuting(outing);
    res.json(items);
  } catch (error) {
    console.error('Error fetching checked out items:', error);
    res.status(500).json({ error: 'Failed to fetch checked out items' });
  }
});

// POST /api/inventory/sync-from-sheets - Sync inventory from Google Sheets to SQLite
router.post('/sync-from-sheets', async (req, res) => {
  try {
    console.log('🔄 Starting sync from Google Sheets...');
    const inventory = await sheetsAPI.syncFromGoogleSheets();
    res.json({ 
      success: true, 
      message: `Successfully synced ${inventory.length} items from Google Sheets`,
      itemCount: inventory.length
    });
  } catch (error) {
    console.error('Error syncing from Google Sheets:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to sync from Google Sheets',
      details: error.message
    });
  }
});

// GET /api/inventory/validate-sheets - Validate Google Sheets data without syncing
router.get('/validate-sheets', async (req, res) => {
  try {
    console.log('🔍 Validating Google Sheets data...');
    const validation = await sheetsAPI.validateGoogleSheetsData();
    res.json({ 
      success: true, 
      validation
    });
  } catch (error) {
    console.error('Error validating Google Sheets:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to validate Google Sheets data',
      details: error.message
    });
  }
});

module.exports = router;
