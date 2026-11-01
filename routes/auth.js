// ---------------------------------------------------------------
// routes/auth.js  ->  signup, login, logout, me
// Password kabhi plain text mein save nahi hota (bcrypt hash).
// Login ke baad JWT token httpOnly cookie mein set hota hai.
// ---------------------------------------------------------------
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, optionalAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,                                   // JavaScript se cookie padhi nahi ja sakti (XSS se safe)
  sameSite: 'lax',                                  // CSRF se basic protection
  secure: process.env.NODE_ENV === 'production',    // production mein sirf HTTPS
  maxAge: 7 * 24 * 60 * 60 * 1000                   // 7 din
};

function issueToken(res, user) {
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, COOKIE_OPTIONS);
  return token;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (name.length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'An account with this email already exists.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, hash);

  const user = { id: info.lastInsertRowid, name, email, role: 'user' };
  const token = issueToken(res, user);
  res.status(201).json({ user, token });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  // Same error dono cases mein, taaki koi guess na kar sake ki email exist karta hai ya nahi
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  const token = issueToken(res, user);
  res.json({ user, token });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: undefined });
  res.json({ message: 'Logged out.' });
});

// GET /api/auth/session  -> hamesha 200: { user } ya { user: null } (browser console mein 401 error nahi aata)
router.get('/session', optionalAuth, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/me   (protected route ka example)
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
