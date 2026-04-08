const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Development security middleware (only for dev)
if (process.env.NODE_ENV === 'development') {
  app.use(require('./middleware/dev-security'));
}

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Routes
const { requireAuth, requireRole } = require('./middleware/auth');

// Public auth routes (no session required)
app.use('/api/auth', require('./routes/auth'));

// All authenticated users
app.use('/api/events',           requireAuth, require('./routes/events'));
app.use('/api/inventory',        requireAuth, require('./routes/inventory'));
app.use('/api/metadata',         requireAuth, require('./routes/metadata'));
app.use('/api/reservations',     requireAuth, require('./routes/reservations'));

// QM + Admin only
app.use('/api/checkout',         requireAuth, requireRole('admin', 'qm'), require('./routes/checkout'));
app.use('/api/checkin',          requireAuth, requireRole('admin', 'qm'), require('./routes/checkin'));
app.use('/api/manage-inventory', requireAuth, requireRole('admin', 'qm'), require('./routes/manage-inventory'));

// Admin only
app.use('/api/manage/members',   requireAuth, requireRole('admin'), require('./routes/manage-members'));

// Lightweight ping endpoint for keep-alive (also touches Supabase to prevent cold connections)
app.get('/api/ping', async (req, res) => {
  const uptime = process.uptime();
  const uptimeSec = Math.floor(uptime);
  const uptimeMin = Math.floor(uptime / 60);
  const uptimeHr = Math.floor(uptime / 3600);

  // Format timestamp in Pacific time
  const now = new Date();
  const timestamp = now
    .toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(/(\d+)\/(\d+)\/(\d+),\s+(\d+:\d+:\d+)/, '$3-$1-$2 $4');

  const timeZone = now
    .toLocaleString('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'short' })
    .split(' ')
    .pop();

  // Keep Supabase connection warm
  try {
    const supabaseAPI = require('./services/supabase-api');
    await supabaseAPI.client.from('items').select('item_id').limit(1);
  } catch (err) {
    console.warn('⚠️ Supabase keep-alive ping failed:', err.message);
  }

  const statusCode = 200;
  const message = `${timestamp} ${timeZone} - SUCCESS: App is healthy (HTTP ${statusCode}, uptime: ${uptimeSec} sec = ${uptimeMin} min = ${uptimeHr} hr)`;
  res.status(statusCode).send(message);
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const supabaseAPI = require('./services/supabase-api');
    const { error } = await supabaseAPI.client.from('items').select('item_id').limit(1);

    if (error) throw error;

    res.json({
      status: 'OK',
      message: 'Scout Gear Management API is running',
      supabase: 'connected',
    });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({
      status: 'ERROR',
      message: 'Cannot connect to Supabase',
      supabase: 'disconnected',
      error: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Catch-all handler: send back React's index.html for client-side routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scout Gear Management API running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Network access: http://0.0.0.0:${PORT}/api/health`);
});
