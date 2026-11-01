// ---------------------------------------------------------------
// middleware/auth.js  ->  "Protected routes" ka gatekeeper
// requireAuth  : sirf logged-in user andar aa sakta hai
// requireAdmin : sirf admin andar aa sakta hai
// ---------------------------------------------------------------
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

function getTokenFromRequest(req) {
  // 1) httpOnly cookie (browser apne aap bhejta hai)
  if (req.cookies && req.cookies.token) return req.cookies.token;
  // 2) ya Authorization: Bearer <token> header (Postman/testing ke liye)
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Please log in first.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // DB se fresh user lo (agar user delete ho gaya ho toh token bekaar)
    const user = db
      .prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
      .get(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found.' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

// Login ho toh req.user set karo, nahi ho toh bhi aage jaane do (error nahi)
function optionalAuth(req, res, next) {
  req.user = null;
  const token = getTokenFromRequest(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(payload.id) || null;
  } catch (err) { /* kharab/expired token = guest */ }
  next();
}

function requireAdmin(req, res, next) {
  // requireAuth ke BAAD lagana hai
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access only.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth, JWT_SECRET };
