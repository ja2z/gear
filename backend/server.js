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

// Lightweight ping endpoint for keep-alive
app.get('/api/ping', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Scout Gear Management API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
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
