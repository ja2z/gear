const express = require('express');
const router = express.Router();
const sheetsAPI = require('../services/sheets-api');

// POST /api/checkout - Process checkout transaction
router.post('/', async (req, res) => {
  try {
    const { itemIds, scoutName, outingName, processedBy, notes } = req.body;
    
    // Validation
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Item IDs are required' });
    }
    
    if (!scoutName || !outingName || !processedBy) {
      return res.status(400).json({ error: 'Scout name, outing name, and processed by are required' });
    }
    
    const results = await sheetsAPI.checkoutItems(
      itemIds,
      scoutName,
      outingName,
      processedBy,
      notes
    );
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    res.json({
      success: failed.length === 0,
      successful,
      failed,
      message: failed.length === 0 
        ? `Successfully checked out ${successful.length} items`
        : `Checked out ${successful.length} items, ${failed.length} failed`
    });
    
  } catch (error) {
    console.error('Error processing checkout:', error);
    res.status(500).json({ error: 'Failed to process checkout' });
  }
});

module.exports = router;
