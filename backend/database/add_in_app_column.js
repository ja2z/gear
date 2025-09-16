const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Migration script to add 'in_app' column to existing database
async function addInAppColumn() {
  const dbPath = path.join(__dirname, 'gear_inventory.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
        reject(err);
        return;
      }
      console.log('✅ Database connected for migration');
    });

    // Check if column already exists
    db.get("PRAGMA table_info(items)", (err, row) => {
      if (err) {
        console.error('❌ Error checking table info:', err);
        db.close();
        reject(err);
        return;
      }
      
      // Get all columns to check if in_app already exists
      db.all("PRAGMA table_info(items)", (err, columns) => {
        if (err) {
          console.error('❌ Error getting table info:', err);
          db.close();
          reject(err);
          return;
        }
        
        const hasInAppColumn = columns.some(col => col.name === 'in_app');
        
        if (hasInAppColumn) {
          console.log('✅ in_app column already exists, skipping migration');
          db.close();
          resolve();
          return;
        }
        
        // Add the in_app column
        console.log('🔄 Adding in_app column to items table...');
        db.run("ALTER TABLE items ADD COLUMN in_app BOOLEAN DEFAULT 1", (err) => {
          if (err) {
            console.error('❌ Error adding in_app column:', err);
            db.close();
            reject(err);
            return;
          }
          
          console.log('✅ Successfully added in_app column');
          
          // Recreate the categories view to include the new filter
          console.log('🔄 Recreating categories view...');
          db.run("DROP VIEW IF EXISTS categories", (err) => {
            if (err) {
              console.error('❌ Error dropping categories view:', err);
              db.close();
              reject(err);
              return;
            }
            
            const createViewSQL = `
              CREATE VIEW categories AS
              SELECT 
                item_class as name,
                item_desc as description,
                COUNT(*) as total_count,
                SUM(CASE WHEN status = 'Available' AND condition = 'Usable' THEN 1 ELSE 0 END) as available_count
              FROM items 
              WHERE in_app = 1
              GROUP BY item_class, item_desc
            `;
            
            db.run(createViewSQL, (err) => {
              if (err) {
                console.error('❌ Error recreating categories view:', err);
                db.close();
                reject(err);
                return;
              }
              
              console.log('✅ Successfully recreated categories view with in_app filter');
              
              // Add index for in_app column
              console.log('🔄 Adding index for in_app column...');
              db.run("CREATE INDEX IF NOT EXISTS idx_items_in_app ON items(in_app)", (err) => {
                if (err) {
                  console.error('❌ Error adding in_app index:', err);
                  db.close();
                  reject(err);
                  return;
                }
                
                console.log('✅ Successfully added in_app index');
                console.log('🎉 Migration completed successfully!');
                db.close();
                resolve();
              });
            });
          });
        });
      });
    });
  });
}

// Run migration if called directly
if (require.main === module) {
  addInAppColumn()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addInAppColumn };
