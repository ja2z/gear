const express = require('express');
const router = express.Router();
const sqliteAPI = require('../services/sqlite-api');
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
    
    // Process checkin in SQLite (data should already be fresh from session start)
    const results = await sqliteAPI.checkinItems(
      itemIds,
      finalConditions,
      processedBy,
      notes
    );
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    // Step 2: Sync successful transactions to Google Sheets
    if (successful.length > 0) {
      console.log('🔄 Syncing successful transactions to Google Sheets...');
      try {
        for (let i = 0; i < successful.length; i++) {
          const result = successful[i];
          const condition = finalConditions[i] || 'Usable';
          
          const transactionData = {
            transactionId: result.transactionId,
            timestamp: new Date().toISOString(),
            action: 'Check in',
            itemId: result.itemId,
            outingName: '', // Checkin doesn't have outing name
            condition: condition,
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
        ? `Successfully checked in ${successful.length} items`
        : `Checked in ${successful.length} items, ${failed.length} failed`
    });
    
  } catch (error) {
    console.error('Error processing checkin:', error);
    res.status(500).json({ error: 'Failed to process checkin' });
  }
});

module.exports = router;
