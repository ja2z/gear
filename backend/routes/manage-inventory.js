const express = require('express');
const router = express.Router();
const supabaseAPI = require('../services/supabase-api');
const { parseCostFromRaw, normalizeCost } = require('../utils/parse-cost');

// GET /api/manage-inventory/items - Get all items for management view
router.get('/items', async (req, res) => {
  try {
    const items = await supabaseAPI.getAllItems();
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/manage-inventory/category-stats - Get category statistics
router.get('/category-stats', async (req, res) => {
  try {
    const stats = await supabaseAPI.getCategoryStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch category stats' });
  }
});

// GET /api/manage-inventory/next-item-num/:class - Get next item number for a category
router.get('/next-item-num/:class', async (req, res) => {
  try {
    const { class: classCode } = req.params;
    const result = await supabaseAPI.getNextItemNum(classCode);
    res.json(result);
  } catch (error) {
    console.error('Error getting next item number:', error);
    res.status(500).json({ error: 'Failed to get next item number' });
  }
});

// GET /api/manage-inventory/items/:itemId - Get single item by ID
router.get('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await supabaseAPI.getItemById(itemId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST /api/manage-inventory/items - Add new item
router.post('/items', async (req, res) => {
  try {
    const itemData = req.body;

    if (!itemData.itemClass || !itemData.itemDesc || !itemData.itemNum || !itemData.itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!itemData.description || !itemData.condition || !itemData.status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (itemData.description.length > 50) {
      return res.status(400).json({ error: 'Description must be 50 characters or less' });
    }

    const validConditions = ['Usable', 'Not usable', 'Unknown'];
    if (!validConditions.includes(itemData.condition)) {
      return res.status(400).json({ error: 'Invalid condition value' });
    }

    const validStatuses = ['In shed', 'Missing', 'Out for repair'];
    if (!validStatuses.includes(itemData.status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    if (itemData.cost !== null && itemData.cost !== undefined && itemData.cost !== '') {
      const cost = parseCostFromRaw(itemData.cost);
      if (cost === null || cost <= 0) {
        return res.status(400).json({ error: 'Cost must be greater than 0' });
      }
    }

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
      cost: normalizeCost(itemData.cost),
      notes: itemData.notes ? itemData.notes.trim() : '',
      inApp: itemData.inApp !== undefined ? itemData.inApp : true,
    };

    await supabaseAPI.addItem(cleanItemData);

    res.json({ success: true, item: cleanItemData });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// PUT /api/manage-inventory/items/:itemId - Update item
router.put('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const updates = req.body;

    const existing = await supabaseAPI.getItemById(itemId);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

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
      const cost = parseCostFromRaw(updates.cost);
      if (cost === null || cost <= 0) {
        return res.status(400).json({ error: 'Cost must be greater than 0' });
      }
    }

    const cleanUpdates = {
      description: updates.description ? updates.description.trim() : undefined,
      isTagged: updates.isTagged,
      condition: updates.condition,
      status: updates.status,
      purchaseDate: updates.purchaseDate || null,
      cost: updates.cost !== undefined ? normalizeCost(updates.cost) : undefined,
      notes: updates.notes !== undefined ? updates.notes.trim() : undefined,
      inApp: updates.inApp,
    };

    Object.keys(cleanUpdates).forEach(
      key => cleanUpdates[key] === undefined && delete cleanUpdates[key]
    );

    // Merge with existing so partial bodies don't null out fields
    const persistUpdates = {
      description: cleanUpdates.description !== undefined ? cleanUpdates.description : existing.description,
      isTagged: cleanUpdates.isTagged !== undefined ? cleanUpdates.isTagged : existing.isTagged,
      condition: cleanUpdates.condition !== undefined ? cleanUpdates.condition : existing.condition,
      status: cleanUpdates.status !== undefined ? cleanUpdates.status : existing.status,
      purchaseDate: cleanUpdates.purchaseDate !== undefined ? cleanUpdates.purchaseDate : existing.purchaseDate,
      cost: cleanUpdates.cost !== undefined ? cleanUpdates.cost : existing.cost,
      notes: cleanUpdates.notes !== undefined ? cleanUpdates.notes : existing.notes,
      inApp: cleanUpdates.inApp !== undefined ? cleanUpdates.inApp : existing.inApp,
    };

    // Pseudo check-in: was checked out, now moving to a non-checkout status
    const isPseudoReturn =
      existing.status === 'Checked out' &&
      cleanUpdates.status !== undefined &&
      cleanUpdates.status !== 'Checked out';

    const txnTimestamp = new Date().toISOString();
    const txnId = isPseudoReturn
      ? `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      : null;

    const baseNotes = persistUpdates.notes || '';
    const logNotes = isPseudoReturn
      ? (baseNotes ? `${baseNotes} | Manage Inventory edit` : 'Manage Inventory edit')
      : '';

    await supabaseAPI.updateItem(itemId, persistUpdates, { clearCheckout: isPseudoReturn });

    if (isPseudoReturn) {
      await supabaseAPI.addTransaction({
        transactionId: txnId,
        timestamp: txnTimestamp,
        action: 'Check in',
        itemId,
        outingName: existing.outingName || '',
        condition: persistUpdates.condition,
        processedBy: 'inventory edit',
        notes: logNotes,
      });
    }

    res.json({ success: true, itemId, updates: cleanUpdates });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/manage-inventory/items/:itemId - Soft delete item
router.delete('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    await supabaseAPI.softDeleteItem(itemId);
    res.json({ success: true, itemId });
  } catch (error) {
    console.error('Error soft deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// GET /api/manage-inventory/items/:itemId/transactions - Transaction log for a specific item
router.get('/items/:itemId/transactions', async (req, res) => {
  try {
    const { itemId } = req.params;
    const transactions = await supabaseAPI.getItemTransactions(itemId);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching item transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transaction log' });
  }
});

// GET /api/manage-inventory/transactions - All transactions with optional filters
router.get('/transactions', async (req, res) => {
  try {
    const { dateRange, outing, itemId, limit, offset } = req.query;

    const filters = {
      dateRange: dateRange || '30',
      outing: outing || '',
      itemId: itemId || '',
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    };

    const result = await supabaseAPI.getAllTransactions(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/manage-inventory/all-outings - All outings from transaction log
router.get('/all-outings', async (req, res) => {
  try {
    const outings = await supabaseAPI.getAllOutingsFromTransactions();
    res.json(outings);
  } catch (error) {
    console.error('Error fetching all outings:', error);
    res.status(500).json({ error: 'Failed to fetch outings' });
  }
});

// GET /api/manage-inventory/outing-breakdown/:outingName - Item breakdown for a specific outing
router.get('/outing-breakdown/:outingName', async (req, res) => {
  try {
    const { outingName } = req.params;
    const breakdown = await supabaseAPI.getOutingItemBreakdown(outingName);
    res.json(breakdown);
  } catch (error) {
    console.error('Error fetching outing breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch outing breakdown' });
  }
});

module.exports = router;
