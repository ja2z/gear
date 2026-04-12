const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;          // 15 minutes
const SESSION_TTL_MS    = 14 * 24 * 60 * 60 * 1000; // 14 days
const SESSION_RENEW_MS  =  7 * 24 * 60 * 60 * 1000; // renew if < 7 days left

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** PostgREST sometimes returns embedded FK rows as a single object or a one-element array. */
function firstRow(embed) {
  if (embed == null) return null;
  return Array.isArray(embed) ? embed[0] ?? null : embed;
}

function roleNameFromEmbed(roles) {
  if (roles == null) return null;
  const r = firstRow(roles);
  return r?.name ?? null;
}

const authService = {
  generateToken,
  hashToken,

  async getUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role_id, roles(name)')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id:         data.id,
      email:      data.email,
      first_name: data.first_name,
      last_name:  data.last_name,
      role_id:    data.role_id,
      role:       roleNameFromEmbed(data.roles),
    };
  },

  async createMagicLink(userId) {
    const rawToken  = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString();

    const { error } = await supabase.from('magic_links').insert({
      user_id:    userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    if (error) throw error;

    return rawToken;
  },

  async verifyMagicLink(rawToken) {
    const tokenHash = hashToken(rawToken);

    const { data, error } = await supabase
      .from('magic_links')
      .select('id, user_id, expires_at, used')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error) throw error;

    if (!data)                                        throw new Error('Invalid token');
    if (data.used)                                    throw new Error('Token already used');
    if (new Date(data.expires_at) < new Date())       throw new Error('Token expired');

    // Mark used immediately to prevent replay
    const { error: updateError } = await supabase
      .from('magic_links')
      .update({ used: true })
      .eq('id', data.id);
    if (updateError) throw updateError;

    return data.user_id;
  },

  async createSession(userId) {
    const rawToken  = generateToken();
    const tokenHash = hashToken(rawToken);
    const now       = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    const { error } = await supabase.from('sessions').insert({
      user_id:    userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;

    return rawToken;
  },

  /**
   * Resolve session by cookie, then load the user row directly (no sessions→users embed).
   * Embedded FK rows were unreliable in some environments; role must match DB for requireRole.
   */
  async getSessionUser(rawToken) {
    const tokenHash = hashToken(rawToken);

    const { data: sess, error } = await supabase
      .from('sessions')
      .select('id, user_id, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error) throw error;
    if (!sess) return null;
    if (new Date(sess.expires_at) < new Date()) return null;

    const { data: u, error: userErr } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role_id, roles(name)')
      .eq('id', sess.user_id)
      .maybeSingle();
    if (userErr) throw userErr;
    if (!u) return null;

    return {
      sessionId: sess.id,
      expiresAt: sess.expires_at,
      user: {
        id:         u.id,
        email:      u.email,
        first_name: u.first_name,
        last_name:  u.last_name,
        role_id:    u.role_id,
        role:       roleNameFromEmbed(u.roles),
      },
    };
  },

  // Returns new raw token if renewed, null if still fresh.
  async renewSessionIfNeeded(sessionId, expiresAt) {
    const msLeft = new Date(expiresAt) - Date.now();
    if (msLeft > SESSION_RENEW_MS) return null;

    const rawToken  = generateToken();
    const tokenHash = hashToken(rawToken);
    const newExpiry = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    const { error } = await supabase
      .from('sessions')
      .update({
        token_hash: tokenHash,
        expires_at: newExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
    if (error) throw error;

    return rawToken;
  },

  async deleteSession(rawToken) {
    const tokenHash = hashToken(rawToken);
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('token_hash', tokenHash);
    if (error) throw error;
  },
};

module.exports = authService;
