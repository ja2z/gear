const express = require('express');
const router = express.Router();
const supabaseAPI = require('../services/supabase-api');
const { sendReservationConfirmation } = require('../services/email-service');
const { formatOutingName } = require('../utils/dateUtils');

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

// GET /api/reservations/:outingName — get items + contact info for a reservation
router.get('/:outingName', async (req, res) => {
  try {
    const outingName = decodeURIComponent(req.params.outingName);
    const reservation = await supabaseAPI.getReservationItems(outingName);
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
    const { itemIds, outingName, reservedBy, reservedEmail } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Item IDs are required' });
    }
    if (!outingName || !reservedBy || !reservedEmail) {
      return res.status(400).json({ error: 'Outing name, your name, and email are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reservedEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const formattedOutingName = formatOutingName(outingName);
    const results = await supabaseAPI.createReservation(itemIds, formattedOutingName, reservedBy, reservedEmail);

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

    // Send confirmation email (non-blocking — don't fail the request if email fails)
    const reservationDate = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    sendReservationConfirmation({
      outingName: formattedOutingName,
      reservedBy,
      reservedEmail,
      items: successful,
      reservationDate,
    }).catch(err => console.error('Email send failed (non-fatal):', err.message));

    res.json({
      success: true,
      successful,
      failed,
      outingName: formattedOutingName,
      message:
        failed.length === 0
          ? `Successfully reserved ${successful.length} items`
          : `Reserved ${successful.length} items, ${failed.length} could not be reserved`,
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// DELETE /api/reservations/:outingName — complete/cancel a reservation (un-reserves lingering items)
router.delete('/:outingName', async (req, res) => {
  try {
    const outingName = decodeURIComponent(req.params.outingName);
    await supabaseAPI.deleteReservation(outingName);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
});

module.exports = router;
