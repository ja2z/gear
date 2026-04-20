const express = require('express');
const router = express.Router();
const supabaseAPI = require('../services/supabase-api');

// GET /api/events — list all events (for dropdowns and management)
router.get('/', async (req, res) => {
  try {
    const events = await supabaseAPI.getEvents();
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/types/list — list event types
router.get('/types/list', async (req, res) => {
  try {
    const types = await supabaseAPI.getEventTypes();
    res.json(types);
  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).json({ error: 'Failed to fetch event types' });
  }
});

// GET /api/events/users/list — list all users for leader dropdowns
router.get('/users/list', async (req, res) => {
  try {
    const users = await supabaseAPI.getUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/events/:id — get a single event
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid event ID' });
    const event = await supabaseAPI.getEventById(id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/events — create a new event
router.post('/', async (req, res) => {
  try {
    const { name, eventTypeId, startDate, startTime, endDate, endTime, timezone, eventSplId, eventAsplId, adultLeaderId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Event name is required' });
    }
    if (!eventTypeId) {
      return res.status(400).json({ error: 'Event type is required' });
    }
    if (!startDate) {
      return res.status(400).json({ error: 'Start date is required' });
    }

    const event = await supabaseAPI.createEvent({
      name: name.trim(),
      eventTypeId,
      startDate,
      startTime: startTime || null,
      endDate: endDate || null,
      endTime: endTime || null,
      timezone: timezone || 'America/Los_Angeles',
      eventSplId: eventSplId || null,
      eventAsplId: eventAsplId || null,
      adultLeaderId: adultLeaderId || null,
    });

    res.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /api/events/:id — update an event
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid event ID' });

    const { name, eventTypeId, startDate, startTime, endDate, endTime, timezone, eventSplId, eventAsplId, adultLeaderId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Event name is required' });
    }
    if (!eventTypeId) {
      return res.status(400).json({ error: 'Event type is required' });
    }
    if (!startDate) {
      return res.status(400).json({ error: 'Start date is required' });
    }

    const event = await supabaseAPI.updateEvent(id, {
      name: name.trim(),
      eventTypeId,
      startDate,
      startTime: startTime || null,
      endDate: endDate || null,
      endTime: endTime || null,
      timezone: timezone || 'America/Los_Angeles',
      eventSplId: eventSplId || null,
      eventAsplId: eventAsplId || null,
      adultLeaderId: adultLeaderId || null,
    });

    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id — delete an event
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid event ID' });

    await supabaseAPI.deleteEvent(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    // FK violation: event has associated items/transactions
    if (error.code === '23503') {
      return res.status(409).json({ error: 'Cannot delete event with associated gear or transactions' });
    }
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
