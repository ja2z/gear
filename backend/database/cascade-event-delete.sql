-- Migration: Update event FK delete rules for safe outing deletion
--
-- items.event_id       → SET NULL  (gear stays in inventory, checkout link cleared)
-- transactions.event_id → SET NULL  (audit rows survive, event link becomes null)
-- reservations.event_id → CASCADE   (reservation is meaningless without its event)

ALTER TABLE items
  DROP CONSTRAINT items_event_id_fkey,
  ADD CONSTRAINT items_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;

ALTER TABLE transactions
  DROP CONSTRAINT transactions_event_id_fkey,
  ADD CONSTRAINT transactions_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;

ALTER TABLE reservations
  DROP CONSTRAINT reservations_event_id_fkey,
  ADD CONSTRAINT reservations_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
