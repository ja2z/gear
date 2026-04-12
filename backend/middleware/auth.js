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

/** Normalize roles.name from Postgres (Admin / QM / Basic) — compare lowercase to allowed list. */
function canonicalRoleName(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (s === 'administrator') return 'admin';
  if (s === 'quartermaster') return 'qm';
  return s;
}

function requireRole(...allowedRoles) {
  const allowedNames = allowedRoles.map((r) => String(r).toLowerCase());
  return function (req, res, next) {
    const raw = req.user?.role;
    const name =
      raw == null || raw === ''
        ? 'admin'
        : (canonicalRoleName(raw) ?? String(raw).trim().toLowerCase());
    if (allowedNames.includes(name)) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: insufficient role' });
  };
}

module.exports = { requireAuth, requireRole, COOKIE_NAME, COOKIE_OPTIONS };
