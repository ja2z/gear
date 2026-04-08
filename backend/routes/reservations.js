const express = require('express');
const router = express.Router();
const supabaseAPI = require('../services/supabase-api');
const { sendReservationConfirmation } = require('../services/email-service');

// GET /api/reservations — list active reservations
router.get('/', async (req, res) => {
  try {
    const reservations = await supabaseAPI.getReservations();
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// GET /api/reservations/:eventId — get items + contact info for a reservation
router.get('/:eventId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    const reservation = await supabaseAPI.getReservationItems(eventId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    res.json(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

// POST /api/reservations — create a reservation
router.post('/', async (req, res) => {
  try {
    const { itemIds, eventId, reservedBy, reservedEmail } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Item IDs are required' });
    }
    if (!eventId || !reservedBy || !reservedEmail) {
      return res.status(400).json({ error: 'Event, your name, and email are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reservedEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const parsedEventId = parseInt(eventId, 10);
    if (isNaN(parsedEventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Look up event name for confirmation email
    const event = await supabaseAPI.getEventById(parsedEventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const results = await supabaseAPI.createReservation(itemIds, parsedEventId, reservedBy, reservedEmail);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length === 0) {
      return res.status(422).json({
        success: false,
        successful,
        failed,
        message: 'No items could be reserved',
      });
    }

    // Send confirmation email (non-blocking)
    const reservationDate = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    sendReservationConfirmation({
      outingName: event.name,
      reservedBy,
      reservedEmail,
      items: successful,
      reservationDate,
    }).catch(err => console.error('Email send failed (non-fatal):', err.message));

    res.json({
      success: true,
      successful,
      failed,
      eventId: parsedEventId,
      outingName: event.name,
      message:
        failed.length === 0
          ? `Successfully reserved ${successful.length} items`
          : `Reserved ${successful.length} items, ${failed.length} could not be reserved`,
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    const payload = { error: 'Failed to create reservation' };
    if (process.env.NODE_ENV !== 'production' && error?.message) {
      payload.details = error.message;
    }
    res.status(500).json(payload);
  }
});

// DELETE /api/reservations/:eventId — complete/cancel a reservation
router.delete('/:eventId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    await supabaseAPI.deleteReservation(eventId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
});

module.exports = router;
