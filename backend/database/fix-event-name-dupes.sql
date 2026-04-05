-- =============================================================================
-- One-time cleanup: strip baked-in date suffixes from event names and
-- deduplicate case-variant events (e.g. "Black diamond" vs "Black Diamond").
-- =============================================================================

BEGIN;

-- 1. Strip all trailing " (Mon YYYY)" suffixes from every event name
UPDATE events
SET name = trim(regexp_replace(
  name,
  '(\s*\((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\))+\s*$',
  '', 'g'
))
WHERE name ~ '\((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\)';

-- 2. Build a canonical-id map: for each (lower(name), start_date) group keep min(id)
CREATE TEMP TABLE _canon AS
SELECT
  min(id)            AS canonical_id,
  lower(trim(name))  AS lname,
  start_date
FROM events
GROUP BY lower(trim(name)), start_date
HAVING count(*) > 1;

-- 3. Re-point items to canonical event
UPDATE items i
SET event_id = c.canonical_id
FROM events e
JOIN _canon c
  ON lower(trim(e.name)) = c.lname
 AND (e.start_date IS NOT DISTINCT FROM c.start_date)
 AND e.id <> c.canonical_id
WHERE i.event_id = e.id;

-- 4. Re-point transactions to canonical event
UPDATE transactions t
SET event_id = c.canonical_id
FROM events e
JOIN _canon c
  ON lower(trim(e.name)) = c.lname
 AND (e.start_date IS NOT DISTINCT FROM c.start_date)
 AND e.id <> c.canonical_id
WHERE t.event_id = e.id;

-- 5. Re-point reservations to canonical event (event_id is PK so update carefully)
UPDATE reservations r
SET event_id = c.canonical_id
FROM events e
JOIN _canon c
  ON lower(trim(e.name)) = c.lname
 AND (e.start_date IS NOT DISTINCT FROM c.start_date)
 AND e.id <> c.canonical_id
WHERE r.event_id = e.id;

-- 6. Delete the now-orphaned duplicate event rows
DELETE FROM events e
USING _canon c
WHERE lower(trim(e.name)) = c.lname
  AND (e.start_date IS NOT DISTINCT FROM c.start_date)
  AND e.id <> c.canonical_id;

DROP TABLE _canon;

-- Show what's left
SELECT id, name, start_date FROM events ORDER BY start_date DESC NULLS LAST;

COMMIT;
