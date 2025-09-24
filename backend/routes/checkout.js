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
      return res.status(400).json({ error: 'Outing leader name, outing name, and QM name are required' });
    }
    
    // Process checkout in SQLite (data should already be fresh from session start)
    const results = await sqliteAPI.checkoutItems(
      itemIds,
      scoutName,
      outingName,
      processedBy,
      notes
    );
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    // Step 2: Sync successful transactions to Google Sheets in batch
    if (successful.length > 0) {
      console.log('🔄 Syncing successful transactions to Google Sheets...');
      try {
        // Prepare all transaction data for batch sync
        const transactionsData = successful.map(result => ({
          transactionId: result.transactionId,
          timestamp: new Date().toISOString(),
          action: 'Check out',
          itemId: result.itemId,
          outingName: outingName,
          scoutName: scoutName, // Add scout name to transaction data
          condition: result.condition || 'Usable', // Use original condition or default to Usable
          processedBy: processedBy,
          notes: notes
        }));
        
        // Use batch sync instead of individual calls
        await sheetsAPI.batchSyncToGoogleSheets(transactionsData);
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
