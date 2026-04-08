const express = require('express');
const router  = express.Router();
const { rateLimit } = require('express-rate-limit');
const authService              = require('../services/auth-service');
const { sendMagicLink }        = require('../services/email-service');
const { COOKIE_NAME, COOKIE_OPTIONS } = require('../middleware/auth');

function getAppUrl(req) {
  if (process.env.NODE_ENV === 'production') return process.env.APP_URL;
  // In dev, use the Origin header — the browser sets this to the frontend URL
  // (e.g. http://192.168.1.84:5173) and Vite's proxy forwards it. This survives
  // the Vite proxy hop, unlike req.hostname which always resolves to localhost.
  const origin = req.headers.origin;
  if (origin) return origin;
  return process.env.APP_URL;
}

const requestLinkLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a minute.' },
});

// POST /api/auth/request-link
// Body: { email }
// Always returns 200 to prevent user enumeration.
router.post('/request-link', requestLinkLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await authService.getUserByEmail(email);
    if (user) {
      const rawToken = await authService.createMagicLink(user.id);
      const magicLink = `${getAppUrl(req)}/#/auth/verify?token=${rawToken}`;
      await sendMagicLink({ to: user.email, first_name: user.first_name, magicLink });
    }
    res.json({ message: 'If that email is registered, a login link has been sent.' });
  } catch (err) {
    console.error('Error sending magic link:', err.message);
    res.status(500).json({ error: 'Failed to send login link' });
  }
});

// GET /api/auth/verify?token=...
// Verifies the magic link token, creates a session, sets the cookie.
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const userId     = await authService.verifyMagicLink(token);
    const rawSession = await authService.createSession(userId);
    res.cookie(COOKIE_NAME, rawSession, COOKIE_OPTIONS);

    const session = await authService.getSessionUser(rawSession);
    res.json({ user: session.user });
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ error: 'Invalid or expired login link' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const rawToken = req.cookies?.[COOKIE_NAME];
  if (rawToken) {
    try {
      await authService.deleteSession(rawToken);
    } catch (err) {
      console.warn('Logout session delete failed (non-fatal):', err.message);
    }
  }
  res.clearCookie(COOKIE_NAME);
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
// No requireAuth middleware — 401 is the expected "not logged in" response.
router.get('/me', async (req, res) => {
  const rawToken = req.cookies?.[COOKIE_NAME];
  if (!rawToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const session = await authService.getSessionUser(rawToken);
    if (!session) {
      res.clearCookie(COOKIE_NAME);
      return res.status(401).json({ error: 'Session expired' });
    }
    res.json({ user: session.user });
  } catch (err) {
    console.error('GET /me error:', err.message);
    res.status(500).json({ error: 'Auth error' });
  }
});

module.exports = router;
