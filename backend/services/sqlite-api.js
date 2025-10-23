const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class SQLiteAPI {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '..', 'database', 'gear_inventory.db');
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          console.error('❌ Error opening SQLite database:', err);
          reject(err);
        } else {
          const timestamp = new Date().toISOString();
          console.log(`[${timestamp}] ✅ SQLite database connected`);
          
          // Create tables if they don't exist
          try {
            await this.createTables();
            this.initialized = true;
            resolve();
          } catch (tableErr) {
            console.error('❌ Error creating tables:', tableErr);
            reject(tableErr);
          }
        }
      });
    });
  }

  async createTables() {
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    return new Promise((resolve, reject) => {
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('❌ Error creating tables:', err);
          reject(err);
        } else {
          // Set performance optimizations
          this.db.run("PRAGMA journal_mode=WAL", (err) => {
            if (err) console.warn('⚠️ Could not set WAL mode:', err.message);
          });
          this.db.run("PRAGMA synchronous=NORMAL", (err) => {
            if (err) console.warn('⚠️ Could not set synchronous mode:', err.message);
          });
          this.db.run("PRAGMA cache_size=10000", (err) => {
            if (err) console.warn('⚠️ Could not set cache size:', err.message);
          });
          this.db.run("PRAGMA temp_store=MEMORY", (err) => {
            if (err) console.warn('⚠️ Could not set temp store:', err.message);
          });
          
          const timestamp = new Date().toISOString();
          console.log(`[${timestamp}] ✅ Database tables created/verified with performance optimizations`);
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
        WHERE in_app = 1 AND status != 'Removed from inventory'
        ORDER BY item_class, item_num
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error fetching inventory:', err);
          reject(err);
        } else {
          const inventory = rows.map(row => this.mapRowToItem(row));
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

  async getCategoriesWithItemDescriptions() {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          item_class as name,
          item_desc as description,
          COUNT(*) as total_count,
          SUM(CASE WHEN status = 'In shed' AND (condition = 'Usable' OR condition = 'Unknown') THEN 1 ELSE 0 END) as available_count,
          GROUP_CONCAT(COALESCE(description, ''), ' ') as item_descriptions
        FROM items 
        WHERE in_app = 1 AND status != 'Removed from inventory'
        GROUP BY item_class, item_desc
        ORDER BY item_class
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error fetching categories with item descriptions:', err);
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
        WHERE item_class = ? AND in_app = 1 AND status != 'Removed from inventory'
        ORDER BY item_num
      `;
      
      this.db.all(query, [category], (err, rows) => {
        if (err) {
          console.error('Error fetching items by category:', err);
          reject(err);
        } else {
          const items = rows.map(row => this.mapRowToItem(row));
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
        
        if (item.status !== 'In shed' || (item.condition !== 'Usable' && item.condition !== 'Unknown')) {
          results.push({ itemId, success: false, error: 'Item not available' });
          continue;
        }
        
        // Update item status
        await this.updateItemStatus(itemId, {
          status: 'Checked out',
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
        
        results.push({ itemId, success: true, transactionId, condition: item.condition });
        
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
        
        // Update item status - special handling for Missing items
        const itemStatus = condition === 'Missing' ? 'Missing' : 'In shed';
        const itemCondition = condition === 'Missing' ? 'Unknown' : condition;
        
        await this.updateItemStatus(itemId, {
          status: itemStatus,
          checkedOutTo: '',
          checkedOutBy: '',
          checkOutDate: null,
          outingName: '',
          condition: itemCondition,
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
        
        results.push({ 
          itemId, 
          success: true, 
          transactionId,
          status: itemStatus,
          condition: itemCondition
        });
        
      } catch (error) {
        console.error(`Error checking in item ${itemId}:`, error);
        results.push({ itemId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  async getItemById(itemId) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          item_class, item_desc, item_num, item_id, description, is_tagged,
          condition, status, purchase_date, cost, checked_out_to, checked_out_by,
          check_out_date, outing_name, notes, in_app
        FROM items 
        WHERE item_id = ? AND status != 'Removed from inventory'
      `;
      
      this.db.get(query, [itemId], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(this.mapRowToItem(row));
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
        WHERE status = 'Checked out' 
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
        WHERE status = 'Checked out' AND outing_name = ? AND in_app = 1
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

  async getOutingDetails(outingName) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          outing_name,
          checked_out_to,
          checked_out_by,
          check_out_date,
          notes
        FROM items 
        WHERE status = 'Checked out' AND outing_name = ? AND in_app = 1
        LIMIT 1
      `;
      
      this.db.get(query, [outingName], (err, row) => {
        if (err) {
          console.error('Error fetching outing details:', err);
          reject(err);
        } else if (row) {
          resolve({
            outingName: row.outing_name,
            scoutName: row.checked_out_to,
            qmName: row.checked_out_by,
            date: row.check_out_date,
            notes: row.notes || ''
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  // Helper method to map database row to item object
  mapRowToItem(row) {
    return {
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
    };
  }

  // ========== METADATA (CATEGORIES) MANAGEMENT ==========

  async getMetadataCategories() {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT class, class_desc
        FROM metadata
        ORDER BY class_desc
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error fetching metadata categories:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async addMetadataCategory(categoryData) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO metadata (class, class_desc)
        VALUES (?, ?)
      `;
      
      this.db.run(query, [categoryData.class, categoryData.classDesc], function(err) {
        if (err) {
          console.error('Error adding metadata category:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async updateMetadataCategory(classCode, newClassDesc) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE metadata
        SET class_desc = ?, updated_at = CURRENT_TIMESTAMP
        WHERE class = ?
      `;
      
      this.db.run(query, [newClassDesc, classCode], function(err) {
        if (err) {
          console.error('Error updating metadata category:', err);
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async checkCategoryUniqueness(classCode, classDesc, excludeClass = null) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM metadata WHERE class = ? AND class != ?) as class_count,
          (SELECT COUNT(*) FROM metadata WHERE class_desc = ? AND class != ?) as class_desc_count
      `;
      
      this.db.get(query, [classCode, excludeClass || '', classDesc, excludeClass || ''], (err, row) => {
        if (err) {
          console.error('Error checking category uniqueness:', err);
          reject(err);
        } else {
          resolve({
            classUnique: row.class_count === 0,
            classDescUnique: row.class_desc_count === 0
          });
        }
      });
    });
  }

  async clearMetadataTable() {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM metadata', (err) => {
        if (err) {
          console.error('Error clearing metadata table:', err);
          reject(err);
        } else {
          console.log('✅ Cleared metadata table');
          resolve();
        }
      });
    });
  }

  // ========== ITEM MANAGEMENT ==========

  async getAllItems() {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          item_class, item_desc, item_num, item_id, description, is_tagged,
          condition, status, purchase_date, cost, checked_out_to, checked_out_by,
          check_out_date, outing_name, notes, in_app
        FROM items 
        WHERE status != 'Removed from inventory'
        ORDER BY item_desc, item_num
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error fetching all items:', err);
          reject(err);
        } else {
          resolve(rows.map(row => this.mapRowToItem(row)));
        }
      });
    });
  }

  async getNextItemNum(classCode) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT MAX(CAST(item_num AS INTEGER)) as max_num
        FROM items
        WHERE item_class = ? AND status != 'Removed from inventory'
      `;
      
      this.db.get(query, [classCode], (err, row) => {
        if (err) {
          console.error('Error getting next item number:', err);
          reject(err);
        } else {
          const maxNum = row.max_num || 0;
          const nextNum = (maxNum + 1).toString().padStart(3, '0');
          const nextItemId = `${classCode}-${nextNum}`;
          resolve({ nextNum, nextItemId });
        }
      });
    });
  }

  async addItem(itemData) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO items (
          item_class, item_desc, item_num, item_id, description, is_tagged,
          condition, status, purchase_date, cost, checked_out_to, checked_out_by,
          check_out_date, outing_name, notes, in_app
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        itemData.itemClass, itemData.itemDesc, itemData.itemNum, itemData.itemId,
        itemData.description, itemData.isTagged ? 1 : 0, itemData.condition,
        itemData.status, itemData.purchaseDate || null, itemData.cost || null,
        '', '', null, '', itemData.notes || '', itemData.inApp ? 1 : 0
      ], function(err) {
        if (err) {
          console.error('Error adding item:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async updateItem(itemId, updates) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE items
        SET description = ?, is_tagged = ?, condition = ?, status = ?,
            purchase_date = ?, cost = ?, notes = ?, in_app = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE item_id = ?
      `;
      
      this.db.run(query, [
        updates.description,
        updates.isTagged ? 1 : 0,
        updates.condition,
        updates.status,
        updates.purchaseDate || null,
        updates.cost || null,
        updates.notes || '',
        updates.inApp ? 1 : 0,
        itemId
      ], function(err) {
        if (err) {
          console.error('Error updating item:', err);
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async softDeleteItem(itemId) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE items
        SET status = 'Removed from inventory', updated_at = CURRENT_TIMESTAMP
        WHERE item_id = ?
      `;
      
      this.db.run(query, [itemId], function(err) {
        if (err) {
          console.error('Error soft deleting item:', err);
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async getCategoryStats() {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          i.item_class as class,
          i.item_desc as class_desc,
          COUNT(*) as total_items,
          SUM(CASE WHEN i.status = 'In shed' AND (i.condition = 'Usable' OR i.condition = 'Unknown') THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN i.status = 'Checked out' THEN 1 ELSE 0 END) as checked_out,
          SUM(CASE WHEN i.condition = 'Not usable' OR i.status IN ('Missing', 'Out for repair') THEN 1 ELSE 0 END) as unavailable,
          GROUP_CONCAT(COALESCE(i.description, ''), ' ') as item_descriptions
        FROM items i
        WHERE i.status != 'Removed from inventory'
        GROUP BY i.item_class, i.item_desc
        ORDER BY i.item_desc
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error fetching category stats:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Sync inventory from Google Sheets to SQLite
  async syncInventory(items) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      // Start transaction
      this.db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          console.error('Error starting transaction:', err);
          return reject(err);
        }

        // Clear existing items
        this.db.run('DELETE FROM items', (err) => {
          if (err) {
            console.error('Error clearing items:', err);
            this.db.run('ROLLBACK');
            return reject(err);
          }

          // Prepare insert statement
          const insertStmt = this.db.prepare(`
            INSERT INTO items (
              item_class, item_desc, item_num, item_id, description, is_tagged,
              condition, status, purchase_date, cost, checked_out_to, checked_out_by,
              check_out_date, outing_name, notes, in_app
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          // Insert all items
          let errorOccurred = false;
          items.forEach((item) => {
            if (errorOccurred) return;

            insertStmt.run([
              item.itemClass,
              item.itemDesc,
              item.itemNum,
              item.itemId,
              item.description,
              item.isTagged ? 1 : 0,
              item.condition,
              item.status,
              item.purchaseDate || null,
              item.cost || null,
              item.checkedOutTo || '',
              item.checkedOutBy || '',
              item.checkOutDate || null,
              item.outingName || '',
              item.notes || '',
              item.inApp ? 1 : 0
            ], (err) => {
              if (err && !errorOccurred) {
                errorOccurred = true;
                console.error('Error inserting item:', err);
                insertStmt.finalize();
                this.db.run('ROLLBACK');
                reject(err);
              }
            });
          });

          insertStmt.finalize((err) => {
            if (err) {
              console.error('Error finalizing insert:', err);
              this.db.run('ROLLBACK');
              return reject(err);
            }

            if (!errorOccurred) {
              this.db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Error committing transaction:', err);
                  this.db.run('ROLLBACK');
                  reject(err);
                } else {
                  console.log(`Successfully synced ${items.length} items to SQLite`);
                  resolve();
                }
              });
            }
          });
        });
      });
    });
  }

  // Sync metadata (categories) from Google Sheets to SQLite
  async syncMetadata(categories) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      // Start transaction
      this.db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          console.error('Error starting transaction:', err);
          return reject(err);
        }

        // Clear existing metadata
        this.db.run('DELETE FROM metadata', (err) => {
          if (err) {
            console.error('Error clearing metadata:', err);
            this.db.run('ROLLBACK');
            return reject(err);
          }

          // Prepare insert statement
          const insertStmt = this.db.prepare(`
            INSERT INTO metadata (class, class_desc)
            VALUES (?, ?)
          `);

          // Insert all categories
          let errorOccurred = false;
          categories.forEach((category) => {
            if (errorOccurred) return;

            insertStmt.run([
              category.class,
              category.classDesc
            ], (err) => {
              if (err && !errorOccurred) {
                errorOccurred = true;
                console.error('Error inserting category:', err);
                insertStmt.finalize();
                this.db.run('ROLLBACK');
                reject(err);
              }
            });
          });

          insertStmt.finalize((err) => {
            if (err) {
              console.error('Error finalizing insert:', err);
              this.db.run('ROLLBACK');
              return reject(err);
            }

            if (!errorOccurred) {
              this.db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Error committing transaction:', err);
                  this.db.run('ROLLBACK');
                  reject(err);
                } else {
                  console.log(`Successfully synced ${categories.length} categories to SQLite`);
                  resolve();
                }
              });
            }
          });
        });
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
