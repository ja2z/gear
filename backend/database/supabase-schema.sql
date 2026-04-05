-- Scout Troop Gear Management - Supabase (PostgreSQL) Schema
-- Run this once in the Supabase SQL editor before starting the app.
-- For existing databases, use migrate-events.sql instead.

-- Event types (Day Outing, Overnight Outing, Meeting)
CREATE TABLE IF NOT EXISTS event_types (
  id   SERIAL      PRIMARY KEY,
  type VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO event_types (type) VALUES
  ('Day Outing'),
  ('Overnight Outing'),
  ('Meeting')
ON CONFLICT (type) DO NOTHING;

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id             SERIAL       PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  event_type_id  INTEGER      NOT NULL REFERENCES event_types(id),
  start_date     DATE,
  end_date       DATE,
  event_spl      INTEGER      REFERENCES users(id),
  event_aspl     INTEGER      REFERENCES users(id),
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- Items table (Master Inventory)
CREATE TABLE IF NOT EXISTS items (
  id             SERIAL         PRIMARY KEY,
  item_class     TEXT           NOT NULL,
  item_desc      TEXT           NOT NULL,
  item_num       TEXT           NOT NULL,
  item_id        TEXT           UNIQUE NOT NULL,
  description    TEXT,
  is_tagged      BOOLEAN        DEFAULT false,
  condition      TEXT           DEFAULT 'Usable',
  status         TEXT           DEFAULT 'In shed',
  purchase_date  DATE,
  cost           DECIMAL(10,2),
  checked_out_to TEXT,
  checked_out_by TEXT,
  check_out_date DATE,
  event_id       INTEGER        REFERENCES events(id),
  notes          TEXT,
  in_app         BOOLEAN        DEFAULT true,
  created_at     TIMESTAMPTZ    DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    DEFAULT NOW()
);

-- Transactions table (Transaction Log) — append-only audit trail
CREATE TABLE IF NOT EXISTS transactions (
  id             SERIAL       PRIMARY KEY,
  transaction_id TEXT         UNIQUE NOT NULL,
  timestamp      TIMESTAMPTZ  DEFAULT NOW(),
  action         TEXT         NOT NULL,
  item_id        TEXT         NOT NULL,
  event_id       INTEGER      REFERENCES events(id),
  condition      TEXT,
  processed_by   TEXT         NOT NULL,
  notes          TEXT,
  FOREIGN KEY (item_id) REFERENCES items (item_id)
);

-- Metadata table (Categories)
CREATE TABLE IF NOT EXISTS metadata (
  class      TEXT         PRIMARY KEY,
  class_desc TEXT         UNIQUE NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  event_id       INTEGER      PRIMARY KEY REFERENCES events(id),
  reserved_by    TEXT         NOT NULL,
  reserved_email TEXT         NOT NULL,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_item_id        ON items(item_id);
CREATE INDEX IF NOT EXISTS idx_items_status         ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_condition      ON items(condition);
CREATE INDEX IF NOT EXISTS idx_items_event_id       ON items(event_id);
CREATE INDEX IF NOT EXISTS idx_items_in_app         ON items(in_app);
CREATE INDEX IF NOT EXISTS idx_items_class          ON items(item_class);
CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_event_id ON transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_metadata_class_desc  ON metadata(class_desc);
