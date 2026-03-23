const express = require('express');
const router = express.Router();
const supabaseAPI = require('../services/supabase-api');

// POST /api/checkin - Process checkin transaction
router.post('/', async (req, res) => {
  try {
    const { itemIds, conditions, processedBy, notes } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Item IDs are required' });
    }

    if (!processedBy) {
      return res.status(400).json({ error: 'Processed by is required' });
    }

    const finalConditions = conditions || itemIds.map(() => 'Usable');

    const results = await supabaseAPI.checkinItems(itemIds, finalConditions, processedBy, notes);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      success: failed.length === 0,
      successful,
      failed,
      message:
        failed.length === 0
          ? `Successfully checked in ${successful.length} items`
          : `Checked in ${successful.length} items, ${failed.length} failed`,
    });
  } catch (error) {
    console.error('Error processing checkin:', error);
    res.status(500).json({ error: 'Failed to process checkin' });
  }
});

// POST /api/checkin/test-bulk - Test endpoint to checkin all items for a given outing
router.post('/test-bulk', async (req, res) => {
  try {
    const { outingName, processedBy = 'Test QM', notes = 'Bulk test checkin', conditions = [] } = req.body;

    if (!outingName) {
      return res.status(400).json({ error: 'outingName is required for bulk checkin test' });
    }

    console.log(`🧪 Starting bulk test checkin for outing: ${outingName}...`);

    const inventory = await supabaseAPI.getInventory();
    const checkedOutItems = inventory.filter(
      item => item.status === 'Checked out' && item.outingName === outingName
    );

    console.log(`📊 Found ${checkedOutItems.length} checked out items for outing: ${outingName}`);

    if (checkedOutItems.length === 0) {
      return res.status(400).json({
        error: `No checked out items found for outing: ${outingName}`,
        checkedOutCount: 0,
      });
    }

    const itemIds = checkedOutItems.map(item => item.itemId);
    const finalConditions = conditions.length > 0 ? conditions : itemIds.map(() => 'Usable');

    const results = await supabaseAPI.checkinItems(itemIds, finalConditions, processedBy, notes);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Bulk checkin completed: ${successful.length} successful, ${failed.length} failed`);

    res.json({
      success: failed.length === 0,
      totalRequested: itemIds.length,
      successful: successful.length,
      failed: failed.length,
      successfulItems: successful.map(r => r.itemId),
      failedItems: failed.map(r => ({ itemId: r.itemId, error: r.error })),
      message: `Bulk test checkin: ${successful.length} successful, ${failed.length} failed`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing bulk test checkin:', error);
    res.status(500).json({
      error: 'Failed to process bulk test checkin',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
