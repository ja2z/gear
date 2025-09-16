const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const sqliteAPI = require('./sqlite-api');

class SheetsAPI {
  constructor() {
    this.doc = null;
    this.initialized = false;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Create JWT auth for google-spreadsheet v5.x
      const privateKey = process.env.GOOGLE_PRIVATE_KEY
        .replace(/^""/, '')  // Remove leading double quote
        .replace(/^"/, '')   // Remove leading single quote
        .replace(/"$/, '')   // Remove trailing quote
        .replace(/\\n/g, '\n');  // Convert \n to actual newlines
      
      const auth = new JWT({
        email: this.serviceAccountEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.doc = new GoogleSpreadsheet(this.spreadsheetId, auth);
      await this.doc.loadInfo();
      console.log('✅ Google Sheets connected:', this.doc.title);
      this.initialized = true;
    } catch (error) {
      console.error('❌ Error connecting to Google Sheets:', error);
      throw error;
    }
  }

  async syncFromGoogleSheets() {
    await this.initialize();
    
    try {
      console.log('🔄 Syncing from Google Sheets to SQLite...');
      
      // Get the Master Inventory sheet
      const inventorySheet = this.doc.sheetsByTitle['Master Inventory'];
      
      if (!inventorySheet) {
        throw new Error('Master Inventory sheet not found');
      }

      // Load inventory data
      const inventoryRows = await inventorySheet.getRows();
      console.log(`📊 Loaded ${inventoryRows.length} inventory items from Google Sheets`);

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
          status: (row.get('Status') || 'Available').trim(),
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
      
      if (filteredItems.length > 0) {
        console.log(`⚠️ Filtered out ${filteredItems.length} invalid rows:`);
        filteredItems.slice(0, 10).forEach(item => {
          console.log(`  Row ${item.row}: ${item.reason} (ID: ${item.itemId}, Class: ${item.itemClass})`);
        });
        if (filteredItems.length > 10) {
          console.log(`  ... and ${filteredItems.length - 10} more rows`);
        }
      }

      // Clear and repopulate SQLite
      await this.clearSQLiteInventory();
      await this.populateSQLiteInventory(inventoryData);
      
      console.log('✅ Sync from Google Sheets completed');
      return inventoryData;
      
    } catch (error) {
      console.error('❌ Error syncing from Google Sheets:', error);
      throw error;
    }
  }

  async syncToGoogleSheets(transactionData) {
    await this.initialize();
    
    try {
      console.log('🔄 Syncing transaction to Google Sheets...');
      
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
      
      console.log('✅ Sync to Google Sheets completed');
      
    } catch (error) {
      console.error('❌ Error syncing to Google Sheets:', error);
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
        targetRow.set('Status', 'Not available');
        targetRow.set('Checked Out To', transactionData.outingName); // Using outing name as placeholder
        targetRow.set('Checked Out By', transactionData.processedBy);
        targetRow.set('Check Out Date', new Date().toISOString().split('T')[0]);
        targetRow.set('Outing Name', transactionData.outingName);
      } else if (transactionData.action === 'Check in') {
        targetRow.set('Status', 'Available');
        targetRow.set('Checked Out To', '');
        targetRow.set('Checked Out By', '');
        targetRow.set('Check Out Date', '');
        targetRow.set('Outing Name', '');
        targetRow.set('Condition', transactionData.condition);
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
          console.log('🗑️ Cleared existing inventory data from SQLite');
          resolve();
        }
      });
    });
  }

  async populateSQLiteInventory(inventoryData) {
    // Initialize SQLite if needed
    await sqliteAPI.initialize();
    
    // Populate SQLite with fresh data
    let insertedCount = 0;
    for (const item of inventoryData) {
      await new Promise((resolve, reject) => {
        // Use a simpler approach: always update, then insert if no rows were affected
        const updateQuery = `
          UPDATE items SET 
            item_class = ?, item_desc = ?, item_num = ?, description = ?, is_tagged = ?,
            condition = ?, status = ?, purchase_date = ?, cost = ?, checked_out_to = ?, 
            checked_out_by = ?, check_out_date = ?, outing_name = ?, notes = ?, in_app = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE item_id = ?
        `;
        
        const insertQuery = `
          INSERT INTO items (
            item_class, item_desc, item_num, item_id, description, is_tagged,
            condition, status, purchase_date, cost, checked_out_to, checked_out_by,
            check_out_date, outing_name, notes, in_app
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        sqliteAPI.db.run(updateQuery, [
          item.itemClass, item.itemDesc, item.itemNum, item.description,
          item.isTagged, item.condition, item.status, item.purchaseDate, item.cost,
          item.checkedOutTo, item.checkedOutBy, item.checkOutDate, item.outingName, item.notes, item.inApp,
          item.itemId
        ], function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          // If no rows were updated (item doesn't exist), insert it
          if (this.changes === 0) {
            sqliteAPI.db.run(insertQuery, [
              item.itemClass, item.itemDesc, item.itemNum, item.itemId, item.description,
              item.isTagged, item.condition, item.status, item.purchaseDate, item.cost,
              item.checkedOutTo, item.checkedOutBy, item.checkOutDate, item.outingName, item.notes, item.inApp
            ], function(insertErr) {
              if (insertErr) {
                console.error(`Insert error for ${item.itemId}:`, insertErr.message);
                reject(insertErr);
              } else {
                insertedCount++;
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      });
    }
    console.log(`📝 Inserted/updated ${insertedCount} items in SQLite`);
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
}

module.exports = new SheetsAPI();
