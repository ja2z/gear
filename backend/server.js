const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Development security middleware (only for dev)
if (process.env.NODE_ENV === 'development') {
  app.use(require('./middleware/dev-security'));
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Routes
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/checkin', require('./routes/checkin'));
app.use('/api/metadata', require('./routes/metadata'));
app.use('/api/manage-inventory', require('./routes/manage-inventory'));

// Lightweight ping endpoint for keep-alive
app.get('/api/ping', (req, res) => {
  const uptime = process.uptime();
  const uptimeSec = Math.floor(uptime);
  const uptimeMin = Math.floor(uptime / 60);
  const uptimeHr = Math.floor(uptime / 3600);
  
  // Format timestamp in Pacific time
  const now = new Date();
  const timestamp = now.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/(\d+)\/(\d+)\/(\d+),\s+(\d+:\d+:\d+)/, '$3-$1-$2 $4');
  
  // Get timezone abbreviation (PST or PDT)
  const timeZone = now.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'short'
  }).split(' ').pop();
  
  const statusCode = 200;
  const message = `${timestamp} ${timeZone} - SUCCESS: App is healthy (HTTP ${statusCode}, uptime: ${uptimeSec} sec = ${uptimeMin} min = ${uptimeHr} hr)`;
  
  res.status(statusCode).send(message);
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const sheetsAPI = require('./services/sheets-api');
    
    // Test Google Sheets connectivity
    await sheetsAPI.initialize();
    
    res.json({ 
      status: 'OK', 
      message: 'Scout Gear Management API is running',
      googleSheets: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({ 
      status: 'ERROR', 
      message: 'Cannot connect to Google Sheets',
      googleSheets: 'disconnected',
      error: error.message
    });
  }
});

// Debug endpoint for troubleshooting Google Sheets connection
app.get('/api/debug/sheets', async (req, res) => {
  try {
    const debugInfo = {
      environment: process.env.NODE_ENV || 'production',
      hasSheetId: !!process.env.GOOGLE_SHEET_ID,
      hasServiceAccountEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      sheetIdLength: process.env.GOOGLE_SHEET_ID ? process.env.GOOGLE_SHEET_ID.length : 0,
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.substring(0, 20) + '...' : 'NOT SET',
      privateKeyLength: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0,
      privateKeyStart: process.env.GOOGLE_PRIVATE_KEY ? 
        process.env.GOOGLE_PRIVATE_KEY.substring(0, 50) + '...' : 'NOT SET'
    };

    // Try to initialize Google Sheets
    const sheetsAPI = require('./services/sheets-api');
    await sheetsAPI.initialize();
    
    res.json({
      status: 'SUCCESS',
      message: 'Google Sheets connection successful',
      debugInfo
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Google Sheets connection failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      debugInfo: {
        environment: process.env.NODE_ENV || 'production',
        hasSheetId: !!process.env.GOOGLE_SHEET_ID,
        hasServiceAccountEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        sheetIdLength: process.env.GOOGLE_SHEET_ID ? process.env.GOOGLE_SHEET_ID.length : 0,
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.substring(0, 20) + '...' : 'NOT SET',
        privateKeyLength: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0,
        privateKeyStart: process.env.GOOGLE_PRIVATE_KEY ? 
          process.env.GOOGLE_PRIVATE_KEY.substring(0, 50) + '...' : 'NOT SET'
      }
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Catch-all handler: send back React's index.html file for client-side routing
// Use middleware approach that's compatible with Express 5
app.use((req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // For all other routes, serve the React app
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scout Gear Management API running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Network access: http://0.0.0.0:${PORT}/api/health`);
});
