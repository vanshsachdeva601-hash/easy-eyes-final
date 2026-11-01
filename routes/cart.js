// ---------------------------------------------------------------
// routes/cart.js  ->  logged-in user ka cart (database mein save hota hai)
//   GET    /api/cart              cart dekho
//   POST   /api/cart              item add  { productId, quantity }
//   PUT    /api/cart/:productId   quantity badlo { quantity }
//   DELETE /api/cart/:productId   ek item hatao
//   DELETE /api/cart              poora cart khali
// ---------------------------------------------------------------
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { firstImage } = require('../lib/images');

const router = express.Router();
router.use(requireAuth); // is file ke saare routes protected hain

const MAX_QTY = 10;

function getCart(userId) {
  const items = db.prepare(`
    SELECT c.product_id AS productId, c.quantity,
           p.name, p.slug, p.price, p.image1, p.category, p.shape, p.color, p.stock
    FROM cart_items c
    JOIN products p ON p.id = c.product_id
    WHERE c.user_id = ?
    ORDER BY c.id
  `).all(userId).map((i) => ({ ...i, image1: firstImage(i.slug, i.image1), lineTotal: i.price * i.quantity }));

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  return { items, subtotal, count };
}

router.get('/', (req, res) => {
  res.json(getCart(req.user.id));
});

router.post('/', (req, res) => {
  const productId = Number(req.body.productId);
  const qty = Math.floor(Number(req.body.quantity ?? 1));
  if (!Number.isInteger(productId) || !Number.isFinite(qty) || qty < 1) {
    return res.status(400).json({ error: 'Invalid product or quantity.' });
  }

  const product = db.prepare('SELECT id, stock FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  if (product.stock <= 0) return res.status(409).json({ error: 'This frame is out of stock.' });

  const existing = db.prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(req.user.id, productId);
  const wanted = (existing ? existing.quantity : 0) + qty;
  const finalQty = Math.min(wanted, MAX_QTY, product.stock);

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?')
      .run(finalQty, req.user.id, productId);
  } else {
    db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)')
      .run(req.user.id, productId, finalQty);
  }

  res.status(201).json({ ...getCart(req.user.id), capped: finalQty < wanted });
});

router.put('/:productId', (req, res) => {
  const productId = Number(req.params.productId);
  const qty = Math.floor(Number(req.body.quantity));
  if (!Number.isInteger(productId) || !Number.isFinite(qty) || qty < 1) {
    return res.status(400).json({ error: 'Quantity must be 1 or more.' });
  }

  const row = db.prepare(`
    SELECT p.stock FROM cart_items c JOIN products p ON p.id = c.product_id
    WHERE c.user_id = ? AND c.product_id = ?
  `).get(req.user.id, productId);
  if (!row) return res.status(404).json({ error: 'Item is not in your cart.' });

  const limit = Math.min(MAX_QTY, row.stock);
  if (qty > limit) return res.status(409).json({ error: `Only ${limit} available for this frame.` });

  db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?')
    .run(qty, req.user.id, productId);
  res.json(getCart(req.user.id));
});

router.delete('/:productId', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?')
    .run(req.user.id, Number(req.params.productId));
  res.json(getCart(req.user.id));
});

router.delete('/', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
  res.json(getCart(req.user.id));
});

module.exports = router;
module.exports.getCart = getCart;
