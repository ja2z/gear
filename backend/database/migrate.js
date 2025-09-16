const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class DatabaseMigrator {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, 'gear_inventory.db');
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  async createTables() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    return new Promise((resolve, reject) => {
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
        } else {
          console.log('✅ Database tables created');
          resolve();
        }
      });
    });
  }

  async importInventoryFromCSV(csvPath) {
    console.log('📥 Importing inventory from CSV...');
    
    return new Promise((resolve, reject) => {
      const items = [];
      
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          // Map CSV columns to database columns
          const item = {
            item_class: row['Item Class'] || '',
            item_desc: row['Item Desc'] || '',
            item_num: row['Item Num'] || '',
            item_id: row['Item ID'] || '',
            description: row['Description'] || '',
            is_tagged: row['Is Tagged'] === 'TRUE' ? 1 : 0,
            condition: row['Condition'] || 'Usable',
            status: row['Status'] || 'Available',
            purchase_date: row['Purchase Date'] || null,
            cost: row['Cost'] || null,
            checked_out_to: row['Checked Out To'] || '',
            checked_out_by: row['Checked Out By'] || '',
            check_out_date: row['Check Out Date'] || null,
            outing_name: row['Outing Name'] || '',
            notes: row['Notes'] || ''
          };
          
          if (item.item_id) { // Only add items with valid item_id
            items.push(item);
          }
        })
        .on('end', async () => {
          try {
            await this.insertItems(items);
            console.log(`✅ Imported ${items.length} inventory items`);
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  async importTransactionsFromCSV(csvPath) {
    console.log('📥 Importing transactions from CSV...');
    
    return new Promise((resolve, reject) => {
      const transactions = [];
      
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          const transaction = {
            transaction_id: row['Transaction ID'] || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: row['Timestamp'] || new Date().toISOString(),
            action: row['Action'] || '',
            item_id: row['Item ID'] || '',
            outing_name: row['Outing Name'] || '',
            condition: row['Condition'] || '',
            processed_by: row['Processed By'] || '',
            notes: row['Notes'] || ''
          };
          
          if (transaction.item_id && transaction.action) {
            transactions.push(transaction);
          }
        })
        .on('end', async () => {
          try {
            await this.insertTransactions(transactions);
            console.log(`✅ Imported ${transactions.length} transactions`);
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  async insertItems(items) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO items (
        item_class, item_desc, item_num, item_id, description, is_tagged,
        condition, status, purchase_date, cost, checked_out_to, checked_out_by,
        check_out_date, outing_name, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      await new Promise((resolve, reject) => {
        stmt.run([
          item.item_class, item.item_desc, item.item_num, item.item_id,
          item.description, item.is_tagged, item.condition, item.status,
          item.purchase_date, item.cost, item.checked_out_to, item.checked_out_by,
          item.check_out_date, item.outing_name, item.notes
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    stmt.finalize();
  }

  async insertTransactions(transactions) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO transactions (
        transaction_id, timestamp, action, item_id, outing_name,
        condition, processed_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const transaction of transactions) {
      await new Promise((resolve, reject) => {
        stmt.run([
          transaction.transaction_id, transaction.timestamp, transaction.action,
          transaction.item_id, transaction.outing_name, transaction.condition,
          transaction.processed_by, transaction.notes
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    stmt.finalize();
  }

  async addSampleData() {
    console.log('📝 Adding sample data...');
    
    const sampleItems = [
      {
        item_class: 'TENT', item_desc: 'Tents', item_num: '001', item_id: 'TENT-001',
        description: 'Zephyr 3', is_tagged: 1, condition: 'Usable', status: 'Available'
      },
      {
        item_class: 'TENT', item_desc: 'Tents', item_num: '002', item_id: 'TENT-002',
        description: 'Half Dome 2+', is_tagged: 1, condition: 'Usable', status: 'Available'
      },
      {
        item_class: 'TENT', item_desc: 'Tents', item_num: '003', item_id: 'TENT-003',
        description: 'Big Agnes Fly Creek', is_tagged: 1, condition: 'Usable', status: 'Not available',
        checked_out_to: 'John Smith', checked_out_by: 'System', check_out_date: '2024-09-01',
        outing_name: 'Fall Camping'
      },
      {
        item_class: 'SLEEP', item_desc: 'Sleeping Bags', item_num: '001', item_id: 'SLEEP-001',
        description: 'Mummy Bag -20°F', is_tagged: 1, condition: 'Usable', status: 'Available'
      },
      {
        item_class: 'SLEEP', item_desc: 'Sleeping Bags', item_num: '002', item_id: 'SLEEP-002',
        description: 'Rectangular Bag 30°F', is_tagged: 1, condition: 'Usable', status: 'Available'
      },
      {
        item_class: 'COOK', item_desc: 'Cooking Equipment', item_num: '001', item_id: 'COOK-001',
        description: 'Camp Stove', is_tagged: 1, condition: 'Usable', status: 'Available'
      },
      {
        item_class: 'COOK', item_desc: 'Cooking Equipment', item_num: '002', item_id: 'COOK-002',
        description: 'Cook Set', is_tagged: 0, condition: 'Usable', status: 'Available'
      },
      {
        item_class: 'WATER', item_desc: 'Water Treatment', item_num: '001', item_id: 'WATER-001',
        description: 'Water Filter', is_tagged: 1, condition: 'Usable', status: 'Available'
      },
      {
        item_class: 'NAV', item_desc: 'Navigation', item_num: '001', item_id: 'NAV-001',
        description: 'Compass', is_tagged: 1, condition: 'Usable', status: 'Available'
      },
      {
        item_class: 'FIRST', item_desc: 'First Aid', item_num: '001', item_id: 'FIRST-001',
        description: 'First Aid Kit', is_tagged: 1, condition: 'Usable', status: 'Available'
      }
    ];

    await this.insertItems(sampleItems);
    console.log('✅ Sample data added');
  }

  async close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Database connection closed');
    }
  }
}

// CLI usage
async function main() {
  const migrator = new DatabaseMigrator();
  
  try {
    await migrator.initialize();
    await migrator.createTables();
    
    // Check if CSV files exist
    const inventoryCSV = path.join(__dirname, 'master_inventory.csv');
    const transactionsCSV = path.join(__dirname, 'transaction_log.csv');
    
    if (fs.existsSync(inventoryCSV)) {
      await migrator.importInventoryFromCSV(inventoryCSV);
    } else {
      console.log('📝 No inventory CSV found, adding sample data...');
      await migrator.addSampleData();
    }
    
    if (fs.existsSync(transactionsCSV)) {
      await migrator.importTransactionsFromCSV(transactionsCSV);
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await migrator.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseMigrator;
