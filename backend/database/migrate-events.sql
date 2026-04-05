-- =============================================================================
-- Migration: Introduce EVENT_TYPES and EVENTS tables
-- Replace outing_name (free text) with event_id (FK) on items, transactions,
-- and reservations.  Existing outing data is migrated as "Day Outing" events.
-- Placeholder users are inserted for any leader names found in checked_out_to.
--
-- Run with:
--   cd backend
--   source <(grep -v '^#' .env | grep DATABASE_URL)
--   psql "$DATABASE_URL" -f database/migrate-events.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. EVENT_TYPES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_types (
  id   SERIAL      PRIMARY KEY,
  type VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO event_types (type) VALUES
  ('Day Outing'),
  ('Overnight Outing'),
  ('Meeting')
ON CONFLICT (type) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. EVENTS
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3. Collect every unique outing name across items + transactions
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _outing_sources AS
  SELECT
    -- Strip trailing " (Mon YYYY)" suffixes (repeated) that old data had baked in
    trim(regexp_replace(
      outing_name,
      '(\s*\((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\))+\s*$',
      '', 'g'
    ))                         AS outing_name,
    check_out_date             AS outing_date,
    checked_out_to             AS leader_name
  FROM items
  WHERE outing_name IS NOT NULL
    AND outing_name <> ''
UNION ALL
  SELECT
    trim(regexp_replace(
      outing_name,
      '(\s*\((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\))+\s*$',
      '', 'g'
    ))                         AS outing_name,
    timestamp::date            AS outing_date,
    NULL::text                 AS leader_name
  FROM transactions
  WHERE outing_name IS NOT NULL
    AND outing_name <> '';

-- Deduplicate by case-insensitive name so "Black diamond" and "Black Diamond"
-- become one event; use initcap of the most-common casing as the canonical name.
CREATE TEMP TABLE _unique_outings AS
SELECT
  -- Keep the mixed-case variant that appears most; fall back to first alphabetically
  (array_agg(outing_name ORDER BY cnt DESC, outing_name))[1]                     AS outing_name,
  MIN(outing_date) FILTER (WHERE outing_date IS NOT NULL)                        AS first_date,
  MAX(leader_name) FILTER (WHERE leader_name IS NOT NULL AND leader_name <> '')  AS leader_name
FROM (
  SELECT
    outing_name,
    lower(outing_name) AS lname,
    outing_date,
    leader_name,
    count(*) OVER (PARTITION BY lower(outing_name)) AS cnt
  FROM _outing_sources
) sub
GROUP BY lname;

-- ---------------------------------------------------------------------------
-- 4. Insert placeholder users for each unique leader name that isn't already
--    in the users table (matched by generated dummy email).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_role_id INTEGER;
  v_leader  TEXT;
  v_fn      TEXT;
  v_ln      TEXT;
  v_email   TEXT;
BEGIN
  -- Pick the 'basic' role if it exists, otherwise just grab any role id
  SELECT id INTO v_role_id FROM roles WHERE name = 'basic' LIMIT 1;
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM roles ORDER BY id LIMIT 1;
  END IF;

  FOR v_leader IN
    SELECT DISTINCT leader_name
    FROM _unique_outings
    WHERE leader_name IS NOT NULL AND leader_name <> ''
  LOOP
    -- Split on first space: "Jane Smith" -> first_name=Jane, last_name=Smith
    v_fn    := split_part(v_leader, ' ', 1);
    v_ln    := NULLIF(trim(substring(v_leader FROM position(' ' IN v_leader) + 1)), '');
    IF v_ln IS NULL OR v_ln = v_fn THEN v_ln := 'Placeholder'; END IF;

    -- Deterministic dummy email derived from the leader's name
    v_email := lower(regexp_replace(v_leader, '[^a-zA-Z0-9]', '.', 'g'))
               || '@placeholder.t222.org';

    INSERT INTO users (email, first_name, last_name, role_id)
    VALUES (v_email, v_fn, v_ln, v_role_id)
    ON CONFLICT (email) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Insert one event per unique outing name
-- ---------------------------------------------------------------------------
INSERT INTO events (name, event_type_id, start_date, event_spl)
SELECT
  uo.outing_name,
  (SELECT id FROM event_types WHERE type = 'Day Outing'),
  uo.first_date,
  u.id   -- NULL if no matching placeholder user found
FROM _unique_outings uo
LEFT JOIN users u
  ON u.email = lower(regexp_replace(uo.leader_name, '[^a-zA-Z0-9]', '.', 'g'))
              || '@placeholder.t222.org'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Add event_id FK columns to items and transactions
-- ---------------------------------------------------------------------------
ALTER TABLE items        ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id);

-- ---------------------------------------------------------------------------
-- 7. Back-fill event_id from outing_name
-- ---------------------------------------------------------------------------
UPDATE items i
SET    event_id = e.id
FROM   events e
WHERE  i.outing_name = e.name
  AND  i.event_id IS NULL;

UPDATE transactions t
SET    event_id = e.id
FROM   events e
WHERE  t.outing_name = e.name
  AND  t.event_id IS NULL;

-- ---------------------------------------------------------------------------
-- 8. Migrate reservations table
--    The table may not have existed yet; create it fresh with event_id as PK.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE  table_schema = 'public' AND table_name = 'reservations'
  ) THEN
    -- Add event_id if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE  table_name = 'reservations' AND column_name = 'event_id'
    ) THEN
      ALTER TABLE reservations ADD COLUMN event_id INTEGER REFERENCES events(id);
    END IF;

    -- Populate event_id from outing_name
    UPDATE reservations r
    SET    event_id = e.id
    FROM   events e
    WHERE  r.outing_name = e.name
      AND  r.event_id IS NULL;

    -- Create events for any reservation whose outing_name had no match
    INSERT INTO events (name, event_type_id)
    SELECT DISTINCT r.outing_name, (SELECT id FROM event_types WHERE type = 'Day Outing')
    FROM   reservations r
    WHERE  r.event_id IS NULL
      AND  r.outing_name IS NOT NULL
      AND  r.outing_name <> '';

    -- Re-populate after creating the missing events
    UPDATE reservations r
    SET    event_id = e.id
    FROM   events e
    WHERE  r.outing_name = e.name
      AND  r.event_id IS NULL;

    -- Drop old PK (outing_name) and promote event_id to PK
    ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_pkey;
    -- Nullify any remaining unmapped rows (shouldn't exist at this point)
    DELETE FROM reservations WHERE event_id IS NULL;
    ALTER TABLE reservations ALTER COLUMN event_id SET NOT NULL;
    ALTER TABLE reservations ADD PRIMARY KEY (event_id);

    -- Drop the now-redundant outing_name column
    ALTER TABLE reservations DROP COLUMN IF EXISTS outing_name;
  ELSE
    -- Create the table from scratch with the new schema
    CREATE TABLE reservations (
      event_id       INTEGER      PRIMARY KEY REFERENCES events(id),
      reserved_by    TEXT         NOT NULL,
      reserved_email TEXT         NOT NULL,
      created_at     TIMESTAMPTZ  DEFAULT NOW()
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 9. Drop the now-superseded outing_name columns
-- ---------------------------------------------------------------------------
ALTER TABLE items        DROP COLUMN IF EXISTS outing_name;
ALTER TABLE transactions DROP COLUMN IF EXISTS outing_name;

-- ---------------------------------------------------------------------------
-- 10. Indexes
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_items_outing;
CREATE INDEX IF NOT EXISTS idx_items_event_id        ON items(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_event_id ON transactions(event_id);

-- ---------------------------------------------------------------------------
-- Cleanup
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS _outing_sources;
DROP TABLE IF EXISTS _unique_outings;

COMMIT;
