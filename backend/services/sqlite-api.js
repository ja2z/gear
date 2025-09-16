const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLiteAPI {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '..', 'database', 'gear_inventory.db');
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Error opening SQLite database:', err);
          reject(err);
        } else {
          console.log('✅ SQLite database connected');
          this.initialized = true;
          resolve();
        }
      });
    });
  }

  async getInventory() {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          item_class, item_desc, item_num, item_id, description, is_tagged,
          condition, status, purchase_date, cost, checked_out_to, checked_out_by,
          check_out_date, outing_name, notes, in_app
        FROM items 
        WHERE in_app = 1
        ORDER BY item_class, item_num
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error fetching inventory:', err);
          reject(err);
        } else {
          const inventory = rows.map(row => ({
            itemClass: row.item_class,
            itemDesc: row.item_desc,
            itemNum: row.item_num,
            itemId: row.item_id,
            description: row.description,
            isTagged: Boolean(row.is_tagged),
            condition: row.condition,
            status: row.status,
            purchaseDate: row.purchase_date,
            cost: row.cost,
            checkedOutTo: row.checked_out_to,
            checkedOutBy: row.checked_out_by,
            checkOutDate: row.check_out_date,
            outingName: row.outing_name,
            notes: row.notes,
            inApp: Boolean(row.in_app)
          }));
          resolve(inventory);
        }
      });
    });
  }

  async getCategories() {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          name, description, total_count, available_count
        FROM categories
        ORDER BY name
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error fetching categories:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getItemsByCategory(category) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          item_class, item_desc, item_num, item_id, description, is_tagged,
          condition, status, purchase_date, cost, checked_out_to, checked_out_by,
          check_out_date, outing_name, notes, in_app
        FROM items 
        WHERE item_class = ? AND in_app = 1
        ORDER BY item_num
      `;
      
      this.db.all(query, [category], (err, rows) => {
        if (err) {
          console.error('Error fetching items by category:', err);
          reject(err);
        } else {
          const items = rows.map(row => ({
            itemClass: row.item_class,
            itemDesc: row.item_desc,
            itemNum: row.item_num,
            itemId: row.item_id,
            description: row.description,
            isTagged: Boolean(row.is_tagged),
            condition: row.condition,
            status: row.status,
            purchaseDate: row.purchase_date,
            cost: row.cost,
            checkedOutTo: row.checked_out_to,
            checkedOutBy: row.checked_out_by,
            checkOutDate: row.check_out_date,
            outingName: row.outing_name,
            notes: row.notes,
            inApp: Boolean(row.in_app)
          }));
          resolve(items);
        }
      });
    });
  }

  async checkoutItems(itemIds, scoutName, outingName, processedBy, notes = '') {
    await this.initialize();
    const checkoutDate = new Date().toISOString().split('T')[0];
    const results = [];
    
    for (const itemId of itemIds) {
      try {
        // Check if item exists and is available
        const item = await this.getItemById(itemId);
        if (!item) {
          results.push({ itemId, success: false, error: 'Item not found' });
          continue;
        }
        
        if (item.status !== 'Available' || item.condition !== 'Usable') {
          results.push({ itemId, success: false, error: 'Item not available' });
          continue;
        }
        
        // Update item status
        await this.updateItemStatus(itemId, {
          status: 'Not available',
          checkedOutTo: scoutName,
          checkedOutBy: processedBy,
          checkOutDate: checkoutDate,
          outingName: outingName,
          notes: notes
        });
        
        // Add transaction log
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await this.addTransaction({
          transactionId,
          action: 'Check out',
          itemId,
          outingName,
          condition: item.condition,
          processedBy,
          notes
        });
        
        results.push({ itemId, success: true, transactionId });
        
      } catch (error) {
        console.error(`Error checking out item ${itemId}:`, error);
        results.push({ itemId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  async checkinItems(itemIds, conditions, processedBy, notes = '') {
    await this.initialize();
    const results = [];
    
    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const condition = conditions[i] || 'Usable';
      
      try {
        // Check if item exists
        const item = await this.getItemById(itemId);
        if (!item) {
          results.push({ itemId, success: false, error: 'Item not found' });
          continue;
        }
        
        // Update item status
        await this.updateItemStatus(itemId, {
          status: 'Available',
          checkedOutTo: '',
          checkedOutBy: '',
          checkOutDate: null,
          outingName: '',
          condition: condition,
          notes: notes
        });
        
        // Add transaction log
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await this.addTransaction({
          transactionId,
          action: 'Check in',
          itemId,
          outingName: item.outingName || '',
          condition: condition,
          processedBy,
          notes
        });
        
        results.push({ itemId, success: true, transactionId });
        
      } catch (error) {
        console.error(`Error checking in item ${itemId}:`, error);
        results.push({ itemId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  async getItemById(itemId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          item_class, item_desc, item_num, item_id, description, is_tagged,
          condition, status, purchase_date, cost, checked_out_to, checked_out_by,
          check_out_date, outing_name, notes, in_app
        FROM items 
        WHERE item_id = ? AND in_app = 1
      `;
      
      this.db.get(query, [itemId], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve({
            itemClass: row.item_class,
            itemDesc: row.item_desc,
            itemNum: row.item_num,
            itemId: row.item_id,
            description: row.description,
            isTagged: Boolean(row.is_tagged),
            condition: row.condition,
            status: row.status,
            purchaseDate: row.purchase_date,
            cost: row.cost,
            checkedOutTo: row.checked_out_to,
            checkedOutBy: row.checked_out_by,
            checkOutDate: row.check_out_date,
            outingName: row.outing_name,
            notes: row.notes,
            inApp: Boolean(row.in_app)
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  async updateItemStatus(itemId, updates) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE items 
        SET status = ?, checked_out_to = ?, checked_out_by = ?, 
            check_out_date = ?, outing_name = ?, condition = ?, notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE item_id = ?
      `;
      
      this.db.run(query, [
        updates.status, updates.checkedOutTo, updates.checkedOutBy,
        updates.checkOutDate, updates.outingName, updates.condition, updates.notes,
        itemId
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async addTransaction(transaction) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO transactions (
          transaction_id, timestamp, action, item_id, outing_name,
          condition, processed_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        transaction.transactionId, new Date().toISOString(), transaction.action,
        transaction.itemId, transaction.outingName, transaction.condition,
        transaction.processedBy, transaction.notes
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getOutingsWithItems() {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          outing_name,
          COUNT(*) as item_count,
          MIN(check_out_date) as checked_out_date
        FROM items 
        WHERE status = 'Not available' 
          AND outing_name IS NOT NULL 
          AND outing_name != ''
          AND in_app = 1
        GROUP BY outing_name
        ORDER BY checked_out_date DESC
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error fetching outings:', err);
          reject(err);
        } else {
          resolve(rows.map(row => ({
            outingName: row.outing_name,
            itemCount: row.item_count,
            checkedOutDate: row.checked_out_date
          })));
        }
      });
    });
  }

  async getCheckedOutItemsByOuting(outingName) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          item_id, description, checked_out_to, outing_name, 
          check_out_date, condition
        FROM items 
        WHERE status = 'Not available' AND outing_name = ? AND in_app = 1
        ORDER BY item_class, item_num
      `;
      
      this.db.all(query, [outingName], (err, rows) => {
        if (err) {
          console.error('Error fetching checked out items:', err);
          reject(err);
        } else {
          resolve(rows.map(row => ({
            itemId: row.item_id,
            description: row.description,
            checkedOutTo: row.checked_out_to,
            outingName: row.outing_name,
            checkOutDate: row.check_out_date,
            condition: row.condition
          })));
        }
      });
    });
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.initialized = false;
    }
  }
}

module.exports = new SQLiteAPI();
