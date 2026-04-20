-- Migration: TroopTrack event sync support
-- Adds tt_event_id + description to events, creates rsvp_types and rsvp tables.

-- events: TroopTrack event ID (used as upsert key) + description
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS tt_event_id  INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS description  TEXT;

CREATE INDEX IF NOT EXISTS idx_events_tt_event_id ON events(tt_event_id);

-- RSVP response types
CREATE TABLE IF NOT EXISTS rsvp_types (
  id       SERIAL PRIMARY KEY,
  response TEXT   NOT NULL UNIQUE
);

INSERT INTO rsvp_types (id, response) VALUES
  (1, 'Going'),
  (2, 'Not Going'),
  (3, 'No Response')
ON CONFLICT (id) DO NOTHING;

-- RSVP attendance (sync only writes rsvp_type_id=1 / Going rows)
CREATE TABLE IF NOT EXISTS rsvp (
  id           SERIAL  PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  event_id     INTEGER NOT NULL REFERENCES events(id)     ON DELETE CASCADE,
  rsvp_type_id INTEGER NOT NULL REFERENCES rsvp_types(id),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_rsvp_event_id ON rsvp(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_user_id  ON rsvp(user_id);
