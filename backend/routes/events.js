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
    const { name, eventTypeId, startDate, endDate, eventSplId, eventAsplId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Event name is required' });
    }
    if (!eventTypeId) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    const event = await supabaseAPI.createEvent({
      name: name.trim(),
      eventTypeId,
      startDate: startDate || null,
      endDate: endDate || null,
      eventSplId: eventSplId || null,
      eventAsplId: eventAsplId || null,
    });

    res.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// GET /api/events/types — list event types
router.get('/types/list', async (req, res) => {
  try {
    const types = await supabaseAPI.getEventTypes();
    res.json(types);
  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).json({ error: 'Failed to fetch event types' });
  }
});

module.exports = router;
