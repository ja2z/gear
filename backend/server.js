const express = require('express');
const cors = require('cors');
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

// Routes
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/checkin', require('./routes/checkin'));

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scout Gear Management API running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Network access: http://0.0.0.0:${PORT}/api/health`);
});
