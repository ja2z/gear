const express = require('express');
const router = express.Router();
const supabaseAPI = require('../services/supabase-api');
const { formatOutingName } = require('../utils/dateUtils');

// POST /api/checkout - Process checkout transaction
router.post('/', async (req, res) => {
  try {
    const { itemIds, scoutName, outingName, processedBy, notes } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Item IDs are required' });
    }

    if (!scoutName || !outingName || !processedBy) {
      return res.status(400).json({ error: 'Outing leader name, outing name, and QM name are required' });
    }

    const formattedOutingName = formatOutingName(outingName);

    const results = await supabaseAPI.checkoutItems(
      itemIds,
      scoutName,
      formattedOutingName,
      processedBy,
      notes
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      success: failed.length === 0,
      successful,
      failed,
      message:
        failed.length === 0
          ? `Successfully checked out ${successful.length} items`
          : `Checked out ${successful.length} items, ${failed.length} failed`,
    });
  } catch (error) {
    console.error('Error processing checkout:', error);
    res.status(500).json({ error: 'Failed to process checkout' });
  }
});

// POST /api/checkout/test-bulk - Test endpoint to checkout up to N available usable items
router.post('/test-bulk', async (req, res) => {
  try {
    const {
      scoutName = 'Test Scout',
      outingName = 'Test Outing',
      processedBy = 'Test QM',
      notes = 'Bulk test checkout',
      targetCount = 95,
    } = req.body;

    const formattedOutingName = formatOutingName(outingName);

    console.log(`🧪 Starting bulk test checkout of ${targetCount} items...`);

    const inventory = await supabaseAPI.getInventory();
    const availableItems = inventory.filter(
      item => item.status === 'In shed' && item.condition === 'Usable'
    );

    console.log(`📊 Found ${availableItems.length} available items`);

    if (availableItems.length < targetCount) {
      return res.status(400).json({
        error: `Not enough available items. Found ${availableItems.length}, need ${targetCount}`,
        availableCount: availableItems.length,
        targetCount,
      });
    }

    const itemIds = availableItems.slice(0, targetCount).map(item => item.itemId);

    const results = await supabaseAPI.checkoutItems(
      itemIds,
      scoutName,
      formattedOutingName,
      processedBy,
      notes
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Bulk checkout completed: ${successful.length} successful, ${failed.length} failed`);

    res.json({
      success: failed.length === 0,
      totalRequested: targetCount,
      successful: successful.length,
      failed: failed.length,
      successfulItems: successful.map(r => r.itemId),
      failedItems: failed.map(r => ({ itemId: r.itemId, error: r.error })),
      message: `Bulk test checkout: ${successful.length} successful, ${failed.length} failed`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing bulk test checkout:', error);
    res.status(500).json({
      error: 'Failed to process bulk test checkout',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
