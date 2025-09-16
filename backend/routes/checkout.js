const express = require('express');
const router = express.Router();
const sqliteAPI = require('../services/sqlite-api');
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
    
    // Step 1: Sync from Google Sheets to get fresh data
    console.log('🔄 Syncing from Google Sheets before checkout...');
    try {
      await sheetsAPI.syncFromGoogleSheets();
      console.log('✅ Fresh data loaded from Google Sheets');
    } catch (syncError) {
      console.warn('⚠️ Failed to sync from Google Sheets, using cached data:', syncError.message);
      // Continue with cached data if sync fails
    }
    
    // Step 2: Process checkout in SQLite
    const results = await sqliteAPI.checkoutItems(
      itemIds,
      scoutName,
      outingName,
      processedBy,
      notes
    );
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    // Step 3: Sync successful transactions to Google Sheets
    if (successful.length > 0) {
      console.log('🔄 Syncing successful transactions to Google Sheets...');
      try {
        for (const result of successful) {
          const transactionData = {
            transactionId: result.transactionId,
            timestamp: new Date().toISOString(),
            action: 'Check out',
            itemId: result.itemId,
            outingName: outingName,
            condition: 'Usable', // Default condition for checkout
            processedBy: processedBy,
            notes: notes
          };
          await sheetsAPI.syncToGoogleSheets(transactionData);
        }
        console.log('✅ Successfully synced transactions to Google Sheets');
      } catch (syncError) {
        console.error('❌ Failed to sync to Google Sheets:', syncError.message);
        // Don't fail the entire operation if sync fails
      }
    }
    
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
