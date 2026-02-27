/**
 * Auth Middleware (lib/auth.js)
 * ------------------------------
 * Simple session-token based authentication.
 *
 * On login, the server issues a signed token stored in an HttpOnly cookie.
 * Every protected route checks this cookie via requireAuth().
 * Admin-only routes additionally call requireAdmin().
 *
 * Token format: base64( JSON({ userId, role, exp }) ) + "." + HMAC-SHA256 signature
 *
 * ENV: SESSION_SECRET — a long random string, required in production.
 */

const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'changeme-use-a-long-random-secret-in-production';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_NAME = 'monolithe_session';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verify(token) {
  if (!token) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Date.now()) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Issue / clear session cookie
// ---------------------------------------------------------------------------

function issueToken(res, userId, role) {
  const payload = { userId, role, exp: Date.now() + TOKEN_TTL_MS };
  const token = sign(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_TTL_MS,
  });
  return token;
}

function clearToken(res) {
  res.clearCookie(COOKIE_NAME);
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Require a valid session. Attaches req.session = { userId, role }.
 * Returns 401 if missing or invalid.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  const session = verify(token);
  if (!session) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }
  req.session = session;
  next();
}

/**
 * Require ADMIN role. Must be used after requireAuth().
 * Returns 403 if the authenticated user is not an admin.
 */
function requireAdmin(req, res, next) {
  if (req.session?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  next();
}

module.exports = { issueToken, clearToken, requireAuth, requireAdmin };
