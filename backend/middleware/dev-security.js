// Development security middleware
// Only use this for development - NOT for production

const allowedNetworks = [
  '192.168.1.', // Your home network
  '10.0.0.',    // Common home network range
  '172.16.',    // Common home network range
];

function isAllowedIP(ip) {
  // Allow localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return true;
  }
  
  // Check if IP is in allowed network ranges
  return allowedNetworks.some(network => ip.startsWith(network));
}

function devSecurityMiddleware(req, res, next) {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Log all requests for monitoring
  console.log(`🔍 [DEV] ${new Date().toISOString()} - ${clientIP} - ${req.method} ${req.path}`);
  
  // Check if IP is allowed (only in development)
  if (process.env.NODE_ENV === 'development' && !isAllowedIP(clientIP)) {
    console.warn(`⚠️  [DEV] Blocked request from unauthorized IP: ${clientIP}`);
    return res.status(403).json({ 
      error: 'Access denied from this IP address',
      message: 'This development server only accepts connections from trusted networks'
    });
  }
  
  next();
}

module.exports = devSecurityMiddleware;
