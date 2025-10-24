const express = require('express');
const router = express.Router();
const sheetsAPI = require('../services/sheets-api');
const sqliteAPI = require('../services/sqlite-api');

// Sync data from Google Sheets to SQLite
router.post('/sync', async (req, res) => {
  try {
    console.log('Starting inventory sync from Google Sheets to SQLite...');
    
    // Sync Master Inventory using the correct method
    const inventory = await sheetsAPI.syncFromGoogleSheets();
    console.log(`Synced ${inventory.length} inventory items`);
    
    // Sync Metadata (categories)
    const categories = await sheetsAPI.getCategories();
    await sqliteAPI.syncMetadata(categories);
    console.log(`Synced ${categories.length} categories`);
    
    res.json({ 
      success: true, 
      message: 'Sync completed successfully',
      itemCount: inventory.length,
      categoryCount: categories.length
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// Get all items for management view
router.get('/items', async (req, res) => {
  try {
    const items = await sqliteAPI.getAllItems();
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get category statistics for aggregate view
router.get('/category-stats', async (req, res) => {
  try {
    const stats = await sqliteAPI.getCategoryStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch category stats' });
  }
});

// Get next item number for a category
router.get('/next-item-num/:class', async (req, res) => {
  try {
    const { class: classCode } = req.params;
    
    // Get from Google Sheets (source of truth)
    const result = await sheetsAPI.getNextItemNum(classCode);
    
    res.json(result);
  } catch (error) {
    console.error('Error getting next item number:', error);
    res.status(500).json({ error: 'Failed to get next item number' });
  }
});

// Get single item by ID
router.get('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await sqliteAPI.getItemById(itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Add new item
router.post('/items', async (req, res) => {
  try {
    const itemData = req.body;
    
    // Validate required fields
    if (!itemData.itemClass || !itemData.itemDesc || !itemData.itemNum || !itemData.itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!itemData.description || !itemData.condition || !itemData.status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate field lengths
    if (itemData.description.length > 50) {
      return res.status(400).json({ error: 'Description must be 50 characters or less' });
    }
    
    // Validate condition
    const validConditions = ['Usable', 'Not usable', 'Unknown'];
    if (!validConditions.includes(itemData.condition)) {
      return res.status(400).json({ error: 'Invalid condition value' });
    }
    
    // Validate status (for add, only these are allowed)
    const validStatuses = ['In shed', 'Missing', 'Out for repair'];
    if (!validStatuses.includes(itemData.status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    // Validate cost if provided
    if (itemData.cost !== null && itemData.cost !== undefined && itemData.cost !== '') {
      const cost = parseFloat(itemData.cost);
      if (isNaN(cost) || cost <= 0) {
        return res.status(400).json({ error: 'Cost must be greater than 0' });
      }
    }
    
    // Prepare item data
    const cleanItemData = {
      itemClass: itemData.itemClass.trim(),
      itemDesc: itemData.itemDesc.trim(),
      itemNum: itemData.itemNum.trim(),
      itemId: itemData.itemId.trim(),
      description: itemData.description.trim(),
      isTagged: itemData.isTagged || false,
      condition: itemData.condition,
      status: itemData.status,
      purchaseDate: itemData.purchaseDate || null,
      cost: itemData.cost || null,
      notes: itemData.notes ? itemData.notes.trim() : '',
      inApp: itemData.inApp !== undefined ? itemData.inApp : true
    };
    
    // Sync to Google Sheets first (fail fast)
    await sheetsAPI.addItem(cleanItemData);
    
    // Then update SQLite cache
    await sqliteAPI.addItem(cleanItemData);
    
    res.json({ success: true, item: cleanItemData });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update item
router.put('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const updates = req.body;
    
    // Validate required fields if provided
    if (updates.description !== undefined) {
      if (!updates.description || updates.description.length > 50) {
        return res.status(400).json({ error: 'Description must be between 1 and 50 characters' });
      }
    }
    
    if (updates.condition !== undefined) {
      const validConditions = ['Usable', 'Not usable', 'Unknown'];
      if (!validConditions.includes(updates.condition)) {
        return res.status(400).json({ error: 'Invalid condition value' });
      }
    }
    
    if (updates.status !== undefined) {
      const validStatuses = ['In shed', 'Missing', 'Out for repair', 'Checked out'];
      if (!validStatuses.includes(updates.status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
    }
    
    if (updates.cost !== null && updates.cost !== undefined && updates.cost !== '') {
      const cost = parseFloat(updates.cost);
      if (isNaN(cost) || cost <= 0) {
        return res.status(400).json({ error: 'Cost must be greater than 0' });
      }
    }
    
    // Prepare clean updates
    const cleanUpdates = {
      description: updates.description ? updates.description.trim() : undefined,
      isTagged: updates.isTagged,
      condition: updates.condition,
      status: updates.status,
      purchaseDate: updates.purchaseDate || null,
      cost: updates.cost || null,
      notes: updates.notes !== undefined ? updates.notes.trim() : undefined,
      inApp: updates.inApp
    };
    
    // Remove undefined values
    Object.keys(cleanUpdates).forEach(key => 
      cleanUpdates[key] === undefined && delete cleanUpdates[key]
    );
    
    // Sync to Google Sheets first (fail fast)
    await sheetsAPI.updateItemInSheets(itemId, cleanUpdates);
    
    // Then update SQLite cache
    await sqliteAPI.updateItem(itemId, cleanUpdates);
    
    res.json({ success: true, itemId, updates: cleanUpdates });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Soft delete item
router.delete('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // Sync to Google Sheets first (fail fast)
    await sheetsAPI.softDeleteItem(itemId);
    
    // Then update SQLite cache
    await sqliteAPI.softDeleteItem(itemId);
    
    res.json({ success: true, itemId });
  } catch (error) {
    console.error('Error soft deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Get transaction log for a specific item
router.get('/items/:itemId/transactions', async (req, res) => {
  try {
    const { itemId } = req.params;
    const transactions = await sheetsAPI.getItemTransactions(itemId);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching item transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transaction log' });
  }
});

// Get all transactions with optional filters
router.get('/transactions', async (req, res) => {
  try {
    const { dateRange, outing, itemId, limit, offset } = req.query;
    
    const filters = {
      dateRange: dateRange || '30', // Default to last 30 days
      outing: outing || '',
      itemId: itemId || '',
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    };
    
    const result = await sheetsAPI.getAllTransactions(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;

