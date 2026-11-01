// ---------------------------------------------------------------
// routes/reviews.js  ->  ratings aur reviews
//   GET    /api/reviews/product/:productId   (public)  summary + saare reviews
//   POST   /api/reviews/product/:productId   (login)   { rating 1-5, comment }  -> ek user ka ek review (dobara bhejne pe update)
//   DELETE /api/reviews/product/:productId   (login)   apna review hatao
// "Verified purchase" = us user ne ye product kharida hai (cancelled order nahi).
// ---------------------------------------------------------------
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Privacy: poora naam nahi, "Vansh S." jaisa dikhao
function displayName(name) {
  const parts = String(name || 'Customer').trim().split(/\s+/);
  return parts[0] + (parts[1] ? ' ' + parts[1][0].toUpperCase() + '.' : '');
}

function getReviews(productId) {
  const reviews = db.prepare(`
    SELECT r.id, r.user_id AS userId, r.rating, r.comment, r.created_at, u.name,
      EXISTS (
        SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = r.user_id AND oi.product_id = r.product_id AND o.status != 'cancelled'
      ) AS verified
    FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC, r.id DESC
  `).all(productId).map((r) => ({ ...r, name: displayName(r.name), verified: !!r.verified }));

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => { counts[r.rating] += 1; });
  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  return { summary: { avg, count, counts }, reviews };
}

function saveReview(userId, productId, rating, comment) {
  db.prepare(`
    INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id, product_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment, created_at = datetime('now')
  `).run(userId, productId, rating, comment);
}

const productExists = (id) => Number.isInteger(id) && !!db.prepare('SELECT id FROM products WHERE id = ?').get(id);

router.get('/product/:productId', (req, res) => {
  const id = Number(req.params.productId);
  if (!productExists(id)) return res.status(404).json({ error: 'Product not found.' });
  res.json(getReviews(id));
});

router.post('/product/:productId', requireAuth, (req, res) => {
  const id = Number(req.params.productId);
  if (!productExists(id)) return res.status(404).json({ error: 'Product not found.' });

  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Please choose a rating from 1 to 5.' });
  if (comment.length > 1000) return res.status(400).json({ error: 'Review must be under 1000 characters.' });

  saveReview(req.user.id, id, rating, comment);
  res.status(201).json(getReviews(id));
});

router.delete('/product/:productId', requireAuth, (req, res) => {
  const id = Number(req.params.productId);
  db.prepare('DELETE FROM reviews WHERE user_id = ? AND product_id = ?').run(req.user.id, id);
  res.json(getReviews(id));
});

module.exports = router;
module.exports.getReviews = getReviews;
module.exports.saveReview = saveReview;
