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

// POST /api/checkout/test-bulk - Test endpoint to checkout 95 available usable items
router.post('/test-bulk', async (req, res) => {
  try {
    const { scoutName = 'Test Scout', outingName = 'Test Outing', processedBy = 'Test QM', notes = 'Bulk test checkout', targetCount = 95 } = req.body;
    
    console.log(`🧪 Starting bulk test checkout of ${targetCount} items...`);
    
    // Get all available usable items
    const inventory = await sqliteAPI.getInventory();
    const availableItems = inventory.filter(item => 
      item.status === 'In shed' && 
      item.condition === 'Usable'
    );
    
    console.log(`📊 Found ${availableItems.length} available items`);
    
    if (availableItems.length < targetCount) {
      return res.status(400).json({ 
        error: `Not enough available items. Found ${availableItems.length}, need ${targetCount}`,
        availableCount: availableItems.length,
        targetCount: targetCount
      });
    }
    
    // Take first targetCount items
    const itemsToCheckout = availableItems.slice(0, targetCount);
    const itemIds = itemsToCheckout.map(item => item.itemId);
    
    console.log(`🎯 Attempting to checkout ${itemIds.length} items:`, itemIds.slice(0, 5), '...');
    
    // Process checkout using existing logic
    const results = await sqliteAPI.checkoutItems(
      itemIds,
      scoutName,
      outingName,
      processedBy,
      notes
    );
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Bulk checkout completed: ${successful.length} successful, ${failed.length} failed`);
    
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
          scoutName: scoutName,
          condition: result.condition || 'Usable',
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
      totalRequested: 95,
      successful: successful.length,
      failed: failed.length,
      successfulItems: successful.map(r => r.itemId),
      failedItems: failed.map(r => ({ itemId: r.itemId, error: r.error })),
      message: `Bulk test checkout: ${successful.length} successful, ${failed.length} failed`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error processing bulk test checkout:', error);
    res.status(500).json({ 
      error: 'Failed to process bulk test checkout',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
