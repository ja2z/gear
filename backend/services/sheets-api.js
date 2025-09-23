const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const sqliteAPI = require('./sqlite-api');

class SheetsAPI {
  constructor() {
    this.doc = null;
    this.initialized = false;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    this.syncInProgress = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Validate environment variables first
      if (!this.spreadsheetId) {
        throw new Error('GOOGLE_SHEET_ID environment variable is not set');
      }
      if (!this.serviceAccountEmail) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable is not set');
      }
      if (!process.env.GOOGLE_PRIVATE_KEY) {
        throw new Error('GOOGLE_PRIVATE_KEY environment variable is not set');
      }

      console.log('🔧 Initializing Google Sheets connection...');
      console.log(`📊 Sheet ID: ${this.spreadsheetId}`);
      console.log(`📧 Service Account: ${this.serviceAccountEmail}`);
      console.log(`🔑 Private Key Length: ${process.env.GOOGLE_PRIVATE_KEY.length}`);

      // Create JWT auth for google-spreadsheet v5.x
      const privateKey = process.env.GOOGLE_PRIVATE_KEY
        .replace(/^""/, '')  // Remove leading double quote
        .replace(/^"/, '')   // Remove leading single quote
        .replace(/"$/, '')   // Remove trailing quote
        .replace(/\\n/g, '\n');  // Convert \n to actual newlines
      
      console.log(`🔑 Processed Private Key Length: ${privateKey.length}`);
      console.log(`🔑 Private Key Starts With: ${privateKey.substring(0, 30)}...`);
      
      const auth = new JWT({
        email: this.serviceAccountEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.doc = new GoogleSpreadsheet(this.spreadsheetId, auth);
      await this.doc.loadInfo();
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ✅ Google Sheets API connection established - Spreadsheet: "${this.doc.title}"`);
      this.initialized = true;
    } catch (error) {
      console.error('❌ Error connecting to Google Sheets:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : undefined
      });
      throw error;
    }
  }

  async syncFromGoogleSheets() {
    await this.initialize();
    
    const timestamp = new Date().toISOString();
    
    // Prevent concurrent sync operations with more robust checking
    if (this.syncInProgress) {
      console.log(`[${timestamp}] ⏳ Sync already in progress, skipping...`);
      return;
    }
    
    // Set the flag immediately to prevent race conditions
    this.syncInProgress = true;
    console.log(`[${timestamp}] 🔒 Sync lock acquired`);
    
    try {
      console.log(`[${timestamp}] 🔄 Syncing from Google Sheets to SQLite...`);
      
      // Get the Master Inventory sheet
      const inventorySheet = this.doc.sheetsByTitle['Master Inventory'];
      
      if (!inventorySheet) {
        throw new Error('Master Inventory sheet not found');
      }

      // Load inventory data
      console.log(`[${timestamp}] 🌐 Calling Google Sheets API to fetch inventory data...`);
      const apiStartTime = Date.now();
      const inventoryRows = await inventorySheet.getRows();
      const apiElapsedTime = Date.now() - apiStartTime;
      console.log(`[${timestamp}] 🌐 Google Sheets API call completed in ${apiElapsedTime}ms`);
      console.log(`[${timestamp}] 📊 Fetched ${inventoryRows.length} raw rows from Google Sheets API`);

      // Map Google Sheets columns to our data structure with robust validation
      const allItems = inventoryRows.map((row, index) => {
        const itemClass = row.get('Item Class');
        const itemId = row.get('Item ID');
        
        return {
          rowIndex: index + 2, // +2 because Google Sheets is 1-indexed and we skip header
          itemClass: itemClass ? itemClass.trim() : '',
          itemDesc: (row.get('Item Desc') || '').trim(),
          itemNum: (row.get('Item Num') || '').trim(),
          itemId: itemId ? itemId.trim() : '',
          description: (row.get('Description') || '').trim(),
          isTagged: row.get('Is Tagged') === 'TRUE' || row.get('Is Tagged') === true,
          condition: (row.get('Condition') || 'Usable').trim(),
          status: (row.get('Status') || 'In shed').trim(),
          purchaseDate: row.get('Purchase Date') || null,
          cost: row.get('Cost') || null,
          checkedOutTo: (row.get('Checked Out To') || '').trim(),
          checkedOutBy: (row.get('Checked Out By') || '').trim(),
          checkOutDate: row.get('Check Out Date') || null,
          outingName: (row.get('Outing Name') || '').trim(),
          notes: (row.get('Notes') || '').trim(),
          inApp: !(row.get('In App') === 'FALSE' || row.get('In App') === false)
        };
      });
      
      // Filter out invalid rows with detailed logging
      const inventoryData = [];
      const filteredItems = [];
      
      allItems.forEach(item => {
        if (!item.itemId || !item.itemClass) {
          filteredItems.push({
            row: item.rowIndex,
            reason: !item.itemId ? 'Missing Item ID' : 'Missing Item Class',
            itemId: item.itemId || 'N/A',
            itemClass: item.itemClass || 'N/A'
          });
        } else {
          inventoryData.push(item);
        }
      });
      
      // Check for duplicate item IDs in the data
      const itemIds = inventoryData.map(item => item.itemId);
      const duplicates = itemIds.filter((id, index) => itemIds.indexOf(id) !== index);
      if (duplicates.length > 0) {
        console.log(`[${timestamp}] ⚠️ Found ${duplicates.length} duplicate item IDs in Google Sheets data:`, [...new Set(duplicates)]);
        // Log details for each duplicate
        [...new Set(duplicates)].forEach(duplicateId => {
          const duplicateItems = inventoryData.filter(item => item.itemId === duplicateId);
          console.log(`[${timestamp}]   ${duplicateId} appears ${duplicateItems.length} times:`, duplicateItems.map(item => `Row ${item.rowIndex}`));
        });
      } else {
        console.log(`[${timestamp}] ✅ Data validation passed - no duplicate item IDs found in processed data`);
      }
      
      
      if (filteredItems.length > 0) {
        console.log(`[${timestamp}] ⚠️ Filtered out ${filteredItems.length} invalid rows:`);
        filteredItems.slice(0, 10).forEach(item => {
          console.log(`[${timestamp}]   Row ${item.row}: ${item.reason} (ID: ${item.itemId}, Class: ${item.itemClass})`);
        });
        if (filteredItems.length > 10) {
          console.log(`[${timestamp}]   ... and ${filteredItems.length - 10} more rows`);
        }
      }

      console.log(`[${timestamp}] 🔄 Processed ${inventoryData.length} valid inventory items from ${inventoryRows.length} raw rows`);

      // Clear and repopulate SQLite
      await this.clearSQLiteInventory();
      await this.populateSQLiteInventory(inventoryData);
      
      console.log(`[${timestamp}] ✅ Sync from Google Sheets completed`);
      return inventoryData;
      
    } catch (error) {
      console.error(`[${timestamp}] ❌ Error syncing from Google Sheets:`, error);
      throw error;
    } finally {
      this.syncInProgress = false;
      console.log(`[${timestamp}] 🔓 Sync lock released`);
    }
  }

  async syncToGoogleSheets(transactionData) {
    await this.initialize();
    
    try {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🔄 Syncing transaction to Google Sheets...`);
      
      // Get the Transaction Log sheet
      const transactionSheet = this.doc.sheetsByTitle['Transaction Log'];
      
      if (!transactionSheet) {
        throw new Error('Transaction Log sheet not found');
      }

      // Add transaction to Google Sheets
      await transactionSheet.addRow({
        'Transaction ID': transactionData.transactionId,
        'Timestamp': transactionData.timestamp,
        'Action': transactionData.action,
        'Item ID': transactionData.itemId,
        'Outing Name': transactionData.outingName,
        'Condition': transactionData.condition,
        'Processed By': transactionData.processedBy,
        'Notes': transactionData.notes
      });

      // Update inventory in Google Sheets
      await this.updateInventoryInSheets(transactionData);
      
      console.log(`[${timestamp}] ✅ Sync to Google Sheets completed`);
      
    } catch (error) {
      console.error('❌ Error syncing to Google Sheets:', error);
      throw error;
    }
  }

  async batchSyncToGoogleSheets(transactionsData) {
    await this.initialize();
    
    try {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🔄 Batch syncing ${transactionsData.length} transactions to Google Sheets...`);
      
      // Get both sheets
      const transactionSheet = this.doc.sheetsByTitle['Transaction Log'];
      const inventorySheet = this.doc.sheetsByTitle['Master Inventory'];
      
      if (!transactionSheet) {
        throw new Error('Transaction Log sheet not found');
      }
      if (!inventorySheet) {
        throw new Error('Master Inventory sheet not found');
      }

      // Prepare batch data for transaction log
      const transactionRows = transactionsData.map(transaction => ({
        'Transaction ID': transaction.transactionId,
        'Timestamp': transaction.timestamp,
        'Action': transaction.action,
        'Item ID': transaction.itemId,
        'Outing Name': transaction.outingName,
        'Condition': transaction.condition,
        'Processed By': transaction.processedBy,
        'Notes': transaction.notes
      }));

      // Add all transactions to Google Sheets in one batch
      await transactionSheet.addRows(transactionRows);

      // Get all inventory rows once for batch updates
      const inventoryRows = await inventorySheet.getRows();
      
      // Prepare batch updates for inventory
      const inventoryUpdates = [];
      
      for (const transaction of transactionsData) {
        const targetRow = inventoryRows.find(row => row.get('Item ID') === transaction.itemId);
        
        if (!targetRow) {
          console.warn(`⚠️ Item ${transaction.itemId} not found in Master Inventory sheet`);
          continue;
        }
        
        // Update the row based on transaction action
        if (transaction.action === 'Check out') {
          targetRow.set('Status', 'Checked out');
          targetRow.set('Checked Out To', transaction.outingName);
          targetRow.set('Checked Out By', transaction.processedBy);
          targetRow.set('Check Out Date', new Date().toISOString().split('T')[0]);
          targetRow.set('Outing Name', transaction.outingName);
        } else if (transaction.action === 'Check in') {
          // Special handling for Missing items
          const itemStatus = transaction.condition === 'Missing' ? 'Missing' : 'In shed';
          const itemCondition = transaction.condition === 'Missing' ? 'Unknown' : transaction.condition;
          
          
          targetRow.set('Status', itemStatus);
          targetRow.set('Checked Out To', '');
          targetRow.set('Checked Out By', '');
          targetRow.set('Check Out Date', '');
          targetRow.set('Outing Name', '');
          targetRow.set('Condition', itemCondition);
        }
        
        inventoryUpdates.push(targetRow);
      }

      // Save all inventory updates in batch
      if (inventoryUpdates.length > 0) {
        await Promise.all(inventoryUpdates.map(row => row.save()));
        console.log(`✅ Updated inventory for ${inventoryUpdates.length} items in Google Sheets`);
      }
      
      console.log(`[${timestamp}] ✅ Batch sync to Google Sheets completed`);
      
    } catch (error) {
      console.error('❌ Error batch syncing to Google Sheets:', error);
      throw error;
    }
  }

  async updateInventoryInSheets(transactionData) {
    try {
      const inventorySheet = this.doc.sheetsByTitle['Master Inventory'];
      const rows = await inventorySheet.getRows();
      
      // Find the row with the matching Item ID
      const targetRow = rows.find(row => row.get('Item ID') === transactionData.itemId);
      
      if (!targetRow) {
        console.warn(`⚠️ Item ${transactionData.itemId} not found in Master Inventory sheet`);
        return;
      }
      
      // Update the row based on transaction action
      if (transactionData.action === 'Check out') {
        targetRow.set('Status', 'Checked out');
        targetRow.set('Checked Out To', transactionData.outingName); // Using outing name as placeholder
        targetRow.set('Checked Out By', transactionData.processedBy);
        targetRow.set('Check Out Date', new Date().toISOString().split('T')[0]);
        targetRow.set('Outing Name', transactionData.outingName);
      } else if (transactionData.action === 'Check in') {
        // Special handling for Missing items
        const itemStatus = transactionData.condition === 'Missing' ? 'Missing' : 'In shed';
        const itemCondition = transactionData.condition === 'Missing' ? 'Unknown' : transactionData.condition;
        
        
        targetRow.set('Status', itemStatus);
        targetRow.set('Checked Out To', '');
        targetRow.set('Checked Out By', '');
        targetRow.set('Check Out Date', '');
        targetRow.set('Outing Name', '');
        targetRow.set('Condition', itemCondition);
      }
      
      await targetRow.save();
      console.log(`✅ Updated inventory for item ${transactionData.itemId} in Google Sheets`);
      
    } catch (error) {
      console.error('❌ Error updating inventory in Google Sheets:', error);
      throw error;
    }
  }

  async clearSQLiteInventory() {
    // Initialize SQLite if needed
    await sqliteAPI.initialize();
    
    // Clear existing inventory data
    return new Promise((resolve, reject) => {
      sqliteAPI.db.run('DELETE FROM items', (err) => {
        if (err) {
          reject(err);
        } else {
          const timestamp = new Date().toISOString();
          console.log(`[${timestamp}] 🗑️ Cleared existing inventory data from SQLite`);
          resolve();
        }
      });
    });
  }

  async populateSQLiteInventory(inventoryData) {
    // Initialize SQLite if needed
    await sqliteAPI.initialize();
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 💾 Starting SQLite insert operations for ${inventoryData.length} items...`);
    const insertStartTime = Date.now();
    
    // Optimized approach: Use batch transaction with prepared statements
    return new Promise((resolve, reject) => {
      sqliteAPI.db.serialize(() => {
        // Begin transaction for better performance
        sqliteAPI.db.run("BEGIN TRANSACTION");
        
        // Prepare the insert statement once
        const insertQuery = `
          INSERT INTO items (
            item_class, item_desc, item_num, item_id, description, is_tagged,
            condition, status, purchase_date, cost, checked_out_to, checked_out_by,
            check_out_date, outing_name, notes, in_app
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const stmt = sqliteAPI.db.prepare(insertQuery);
        let insertedCount = 0;
        let hasError = false;
        
        // Insert all items using the prepared statement
        for (const item of inventoryData) {
          if (hasError) break;
          
          stmt.run([
            item.itemClass, item.itemDesc, item.itemNum, item.itemId, item.description,
            item.isTagged, item.condition, item.status, item.purchaseDate, item.cost,
            item.checkedOutTo, item.checkedOutBy, item.checkOutDate, item.outingName, item.notes, item.inApp
          ], function(err) {
            if (err) {
              console.error(`❌ Insert error for ${item.itemId}:`, err.message);
              console.error(`   Error code: ${err.code}, Error number: ${err.errno}`);
              console.error(`   Item data:`, {
                itemClass: item.itemClass,
                itemId: item.itemId,
                description: item.description
              });
              hasError = true;
            } else {
              insertedCount++;
            }
          });
        }
        
        // Finalize the prepared statement
        stmt.finalize();
        
        // Commit the transaction
        sqliteAPI.db.run("COMMIT", (err) => {
          if (err) {
            console.error('❌ Error committing transaction:', err);
            reject(err);
          } else if (hasError) {
            console.error('❌ Some items failed to insert');
            reject(new Error('Some items failed to insert'));
          } else {
            const insertElapsedTime = Date.now() - insertStartTime;
            console.log(`[${timestamp}] 💾 SQLite insert operations completed in ${insertElapsedTime}ms`);
            console.log(`[${timestamp}] 📝 Successfully inserted ${insertedCount} items into SQLite database`);
            resolve();
          }
        });
      });
    });
  }

  async getLastSyncTime() {
    // TODO: Implement last sync time tracking
    return new Date();
  }

  async validateGoogleSheetsData() {
    await this.initialize();
    
    try {
      console.log('🔍 Validating Google Sheets data...');
      
      const inventorySheet = this.doc.sheetsByTitle['Master Inventory'];
      const inventoryRows = await inventorySheet.getRows();
      
      const issues = [];
      const validRows = [];
      
      inventoryRows.forEach((row, index) => {
        const rowNum = index + 2; // +2 for header and 1-indexing
        const itemId = row.get('Item ID');
        const itemClass = row.get('Item Class');
        
        if (!itemId || !itemClass) {
          issues.push({
            row: rowNum,
            issue: !itemId ? 'Missing Item ID' : 'Missing Item Class',
            itemId: itemId || 'N/A',
            itemClass: itemClass || 'N/A',
            description: row.get('Description') || 'N/A'
          });
        } else {
          validRows.push({
            row: rowNum,
            itemId: itemId.trim(),
            itemClass: itemClass.trim(),
            description: (row.get('Description') || '').trim()
          });
        }
      });
      
      console.log(`📊 Validation Results:`);
      console.log(`  Total rows: ${inventoryRows.length}`);
      console.log(`  Valid rows: ${validRows.length}`);
      console.log(`  Issues found: ${issues.length}`);
      
      if (issues.length > 0) {
        console.log(`\n❌ Data Issues:`);
        issues.slice(0, 20).forEach(issue => {
          console.log(`  Row ${issue.row}: ${issue.issue} (ID: ${issue.itemId}, Class: ${issue.itemClass})`);
        });
        if (issues.length > 20) {
          console.log(`  ... and ${issues.length - 20} more issues`);
        }
      }
      
      return {
        totalRows: inventoryRows.length,
        validRows: validRows.length,
        issues: issues.length,
        issuesList: issues,
        validRowsList: validRows
      };
      
    } catch (error) {
      console.error('❌ Error validating Google Sheets data:', error);
      throw error;
    }
  }

  async syncAllInventoryFromSheets() {
    try {
      console.log('🔄 Syncing all inventory from Google Sheets...');
      
      await this.initialize();
      
      const inventorySheet = this.doc.sheetsByTitle['Master Inventory'];
      const rows = await inventorySheet.getRows();
      
      console.log(`📊 Found ${rows.length} rows in Master Inventory sheet`);
      
      const inventoryData = rows.map((row, index) => {
        const itemId = row.get('Item ID');
        const itemClass = row.get('Item Class');
        const itemDesc = row.get('Item Desc');
        const itemNum = row.get('Item Num');
        const description = row.get('Description');
        const isTagged = row.get('Is Tagged') === 'TRUE';
        const condition = (row.get('Condition') || 'Usable').trim();
        const status = (row.get('Status') || 'In shed').trim();
        const purchaseDate = row.get('Purchase Date') || null;
        const cost = row.get('Cost') ? parseFloat(row.get('Cost')) : null;
        const checkedOutTo = row.get('Checked Out To') || '';
        const checkedOutBy = row.get('Checked Out By') || '';
        const checkOutDate = row.get('Check Out Date') || null;
        const outingName = row.get('Outing Name') || '';
        const notes = row.get('Notes') || '';
        
        return {
          itemClass,
          itemDesc,
          itemNum,
          itemId,
          description,
          isTagged,
          condition,
          status,
          purchaseDate,
          cost,
          checkedOutTo,
          checkedOutBy,
          checkOutDate,
          outingName,
          notes,
          inApp: true
        };
      }).filter(item => item.itemId); // Only include items with valid itemId
      
      console.log(`✅ Processed ${inventoryData.length} inventory items from Google Sheets`);
      
      // Clear existing SQLite data and populate with fresh data
      await this.clearSQLiteInventory();
      await this.populateSQLiteInventory(inventoryData);
      
      console.log('✅ Successfully synced all inventory from Google Sheets to SQLite');
      return inventoryData;
      
    } catch (error) {
      console.error('❌ Error syncing inventory from Google Sheets:', error);
      throw error;
    }
  }
}

module.exports = new SheetsAPI();
