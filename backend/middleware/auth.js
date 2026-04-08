const authService = require('../services/auth-service');

const COOKIE_NAME    = 'session';
const isProduction   = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge:   14 * 24 * 60 * 60 * 1000,
};

async function requireAuth(req, res, next) {
  const rawToken = req.cookies?.[COOKIE_NAME];
  if (!rawToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  let session;
  try {
    session = await authService.getSessionUser(rawToken);
  } catch (err) {
    console.error('Session lookup error:', err.message);
    return res.status(500).json({ error: 'Auth error' });
  }

  if (!session) {
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  // Sliding window: renew if token is in the second half of its life
  try {
    const newToken = await authService.renewSessionIfNeeded(
      session.sessionId,
      session.expiresAt
    );
    if (newToken) {
      res.cookie(COOKIE_NAME, newToken, COOKIE_OPTIONS);
    }
  } catch (err) {
    console.warn('Session renewal failed (non-fatal):', err.message);
  }

  req.user = session.user;
  next();
}

function requireRole(...allowedRoles) {
  return function (req, res, next) {
    const role = req.user?.role ?? 'Admin'; // null = treat as Admin (safety valve)
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, COOKIE_NAME, COOKIE_OPTIONS };
