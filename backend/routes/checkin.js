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
    
    // Step 2: Sync successful transactions to Google Sheets in batch
    if (successful.length > 0) {
      console.log('🔄 Syncing successful transactions to Google Sheets...');
      try {
        // Prepare all transaction data for batch sync
        const transactionsData = successful.map((result, index) => {
          const condition = finalConditions[index] || 'Usable';
          return {
            transactionId: result.transactionId,
            timestamp: new Date().toISOString(),
            action: 'Check in',
            itemId: result.itemId,
            outingName: '', // Checkin doesn't have outing name
            condition: condition,
            processedBy: processedBy,
            notes: notes
          };
        });
        
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
        ? `Successfully checked in ${successful.length} items`
        : `Checked in ${successful.length} items, ${failed.length} failed`
    });
    
  } catch (error) {
    console.error('Error processing checkin:', error);
    res.status(500).json({ error: 'Failed to process checkin' });
  }
});

// POST /api/checkin/test-bulk - Test endpoint to checkin 95 checked out items
router.post('/test-bulk', async (req, res) => {
  try {
    const { outingName, processedBy = 'Test QM', notes = 'Bulk test checkin', conditions = [] } = req.body;
    
    if (!outingName) {
      return res.status(400).json({ 
        error: 'outingName is required for bulk checkin test'
      });
    }
    
    console.log(`🧪 Starting bulk test checkin of 95 items for outing: ${outingName}...`);
    
    // Get all checked out items for the specific outing
    const inventory = await sqliteAPI.getInventory();
    const checkedOutItems = inventory.filter(item => 
      item.status === 'Checked out' && item.outingName === outingName
    );
    
    console.log(`📊 Found ${checkedOutItems.length} checked out items for outing: ${outingName}`);
    
    if (checkedOutItems.length === 0) {
      return res.status(400).json({ 
        error: `No checked out items found for outing: ${outingName}`,
        checkedOutCount: 0
      });
    }
    
    // Checkin all available items for this outing
    const itemsToCheckin = checkedOutItems;
    const itemIds = itemsToCheckin.map(item => item.itemId);
    
    // Default all conditions to 'Usable' if not provided
    const defaultConditions = itemIds.map(() => 'Usable');
    const finalConditions = conditions.length > 0 ? conditions : defaultConditions;
    
    console.log(`🎯 Attempting to checkin ${itemIds.length} items:`, itemIds.slice(0, 5), '...');
    
    // Process checkin using existing logic
    const results = await sqliteAPI.checkinItems(
      itemIds,
      finalConditions,
      processedBy,
      notes
    );
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Bulk checkin completed: ${successful.length} successful, ${failed.length} failed`);
    
    // Step 2: Sync successful transactions to Google Sheets in batch
    if (successful.length > 0) {
      console.log('🔄 Syncing successful transactions to Google Sheets...');
      try {
        // Prepare all transaction data for batch sync
        const transactionsData = successful.map((result, index) => {
          const condition = finalConditions[index] || 'Usable';
          return {
            transactionId: result.transactionId,
            timestamp: new Date().toISOString(),
            action: 'Check in',
            itemId: result.itemId,
            outingName: '', // Checkin doesn't have outing name
            condition: condition,
            processedBy: processedBy,
            notes: notes
          };
        });
        
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
      totalRequested: 95,
      successful: successful.length,
      failed: failed.length,
      successfulItems: successful.map(r => r.itemId),
      failedItems: failed.map(r => ({ itemId: r.itemId, error: r.error })),
      message: `Bulk test checkin: ${successful.length} successful, ${failed.length} failed`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error processing bulk test checkin:', error);
    res.status(500).json({ 
      error: 'Failed to process bulk test checkin',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
