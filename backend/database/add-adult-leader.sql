-- Migration: Add adult_leader column to events table
-- Run against both dev and prod Supabase instances.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS adult_leader INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_events_adult_leader ON events(adult_leader);
