-- Scout Troop Gear Management Database Schema

-- Items table (Master Inventory)
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_class TEXT NOT NULL,
  item_desc TEXT NOT NULL,
  item_num TEXT NOT NULL,
  item_id TEXT UNIQUE NOT NULL,
  description TEXT,
  is_tagged BOOLEAN DEFAULT 0,
  condition TEXT DEFAULT 'Usable',
  status TEXT DEFAULT 'In shed',
  purchase_date DATE,
  cost DECIMAL(10,2),
  checked_out_to TEXT,
  checked_out_by TEXT,
  check_out_date DATE,
  outing_name TEXT,
  notes TEXT,
  in_app BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table (Transaction Log)
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT UNIQUE NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  action TEXT NOT NULL,
  item_id TEXT NOT NULL,
  outing_name TEXT,
  condition TEXT,
  processed_by TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (item_id) REFERENCES items (item_id)
);

-- Metadata table (Categories from Metadata sheet)
CREATE TABLE IF NOT EXISTS metadata (
  class TEXT PRIMARY KEY,
  class_desc TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories view for easy access
CREATE VIEW IF NOT EXISTS categories AS
SELECT 
  item_class as name,
  item_desc as description,
  COUNT(*) as total_count,
  SUM(CASE WHEN status = 'In shed' AND condition = 'Usable' THEN 1 ELSE 0 END) as available_count
FROM items 
WHERE in_app = 1
GROUP BY item_class, item_desc;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_item_id ON items(item_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_condition ON items(condition);
CREATE INDEX IF NOT EXISTS idx_items_outing ON items(outing_name);
CREATE INDEX IF NOT EXISTS idx_items_in_app ON items(in_app);
CREATE INDEX IF NOT EXISTS idx_items_class ON items(item_class);
CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_metadata_class_desc ON metadata(class_desc);
