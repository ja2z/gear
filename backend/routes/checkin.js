const express = require('express');
const router = express.Router();
const sheetsAPI = require('../services/sheets-api');

// POST /api/checkin - Process checkin transaction
router.post('/', async (req, res) => {
  try {
    const { itemIds, conditions, processedBy, notes } = req.body;
    
    // Validation
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Item IDs are required' });
    }
    
    if (!processedBy) {
      return res.status(400).json({ error: 'Processed by is required' });
    }
    
    // Default conditions to 'Usable' if not provided
    const defaultConditions = itemIds.map(() => 'Usable');
    const finalConditions = conditions || defaultConditions;
    
    const results = await sheetsAPI.checkinItems(
      itemIds,
      finalConditions,
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
        ? `Successfully checked in ${successful.length} items`
        : `Checked in ${successful.length} items, ${failed.length} failed`
    });
    
  } catch (error) {
    console.error('Error processing checkin:', error);
    res.status(500).json({ error: 'Failed to process checkin' });
  }
});

module.exports = router;
