// ---------------------------------------------------------------
// routes/wishlist.js  ->  saved frames (logged-in user ke liye)
//   GET    /api/wishlist              { ids, products }
//   POST   /api/wishlist              { productId }
//   DELETE /api/wishlist/:productId
// ---------------------------------------------------------------
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { withImages } = require('../lib/images');
const { ratingCols } = require('../lib/sql');

const router = express.Router();
router.use(requireAuth);

function getWishlist(userId) {
  const products = db.prepare(`
    SELECT p.*, ${ratingCols('p')}
    FROM wishlist w JOIN products p ON p.id = w.product_id
    WHERE w.user_id = ? ORDER BY w.created_at DESC, p.id DESC
  `).all(userId).map(withImages);
  return { ids: products.map((p) => p.id), products };
}

router.get('/', (req, res) => res.json(getWishlist(req.user.id)));

router.post('/', (req, res) => {
  const productId = Number(req.body.productId);
  if (!Number.isInteger(productId) || !db.prepare('SELECT id FROM products WHERE id = ?').get(productId)) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  db.prepare('INSERT OR IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, productId);
  res.status(201).json(getWishlist(req.user.id));
});

router.delete('/:productId', (req, res) => {
  db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user.id, Number(req.params.productId));
  res.json(getWishlist(req.user.id));
});

module.exports = router;
module.exports.getWishlist = getWishlist;
