// ---------------------------------------------------------------
// routes/admin.js  ->  sirf admin ke liye (requireAuth + requireAdmin)
//   GET  /api/admin/stats                      dashboard numbers
//   GET  /api/admin/orders                     saari orders (customer ke saath)
//   PUT  /api/admin/orders/:id                 status badlo { status }
//   GET  /api/admin/products/:id/images        product ki asli photos
//   POST /api/admin/products/:id/images        photo upload { dataUrl }
//   DELETE /api/admin/products/:id/images?file=aria-3.jpg
//   POST /api/admin/products/:id/images/main   { file }  ->  ise pehli photo bana do
// Products ka add/edit/delete routes/products.js mein hai (wo bhi admin-only).
// ---------------------------------------------------------------
const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { itemsFor } = require('./orders');
const { imagesFor, saveImage, removeImage, makeMain } = require('../lib/images');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const cleanFile = (f) => String(f || '').split('?')[0].split('/').pop(); // '?v=123' hata ke sirf file ka naam

class AdminError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// ---------------------- dashboard ----------------------
function getStats() {
  const one = (sql, ...p) => db.prepare(sql).get(...p);
  const orders = one("SELECT COUNT(*) AS c, COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total END), 0) AS sales FROM orders");
  return {
    sales: orders.sales,
    orders: orders.c,
    products: one('SELECT COUNT(*) AS c FROM products').c,
    customers: one("SELECT COUNT(*) AS c FROM users WHERE role = 'user'").c,
    byStatus: db.prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status').all(),
    lowStock: db.prepare('SELECT id, name, slug, stock FROM products WHERE stock <= 5 ORDER BY stock, id LIMIT 8').all()
  };
}

router.get('/stats', (req, res) => res.json(getStats()));

// ---------------------- orders ----------------------
function listOrders() {
  return db.prepare(`
    SELECT o.*, u.name AS customer_name, u.email AS customer_email
    FROM orders o JOIN users u ON u.id = o.user_id
    ORDER BY o.id DESC LIMIT 500
  `).all().map((o) => ({ ...o, items: itemsFor(o.id) }));
}

router.get('/orders', (req, res) => res.json({ orders: listOrders() }));

const changeStatus = db.transaction((id, status) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) throw new AdminError('Order not found.', 404);
  if (order.status === 'cancelled') throw new AdminError('A cancelled order cannot be changed.', 409);
  if (status === 'cancelled' && order.status === 'delivered') {
    throw new AdminError('A delivered order cannot be cancelled.', 409);
  }

  if (status === 'cancelled') { // stock wapas
    const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(id);
    const restock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
    for (const i of items) restock.run(i.quantity, i.product_id);
  }

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);

  // COD: delivery ke saath payment mil jaata hai
  if (status === 'delivered' && order.payment_method === 'cod' && order.payment_status === 'pending') {
    db.prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?").run(id);
  }
});

router.put('/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || '');
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  try {
    changeStatus(id, status);
    const order = listOrders().find((o) => o.id === id);
    res.json({ order });
  } catch (err) {
    if (err instanceof AdminError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Could not update the order.' });
  }
});

// ---------------------- product photos ----------------------
function productOr404(req, res) {
  const p = db.prepare('SELECT id, slug FROM products WHERE id = ?').get(Number(req.params.id));
  if (!p) res.status(404).json({ error: 'Product not found.' });
  return p;
}

function imageKind(buf) { // file ke andar ke bytes se type pehchano (naam pe bharosa nahi)
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.slice(1, 4).toString() === 'PNG') return 'png';
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

router.get('/products/:id/images', (req, res) => {
  const p = productOr404(req, res);
  if (p) res.json({ images: imagesFor(p.slug) });
});

router.post('/products/:id/images', (req, res) => {
  const p = productOr404(req, res);
  if (!p) return;
  const m = /^data:image\/(?:jpeg|png|webp);base64,(.+)$/.exec(String(req.body.dataUrl || ''));
  if (!m) return res.status(400).json({ error: 'Upload a JPG, PNG or WebP image.' });
  const buf = Buffer.from(m[1], 'base64');
  if (!buf.length || buf.length > MAX_IMAGE_BYTES) return res.status(400).json({ error: 'Image must be under 8 MB.' });
  const ext = imageKind(buf);
  if (!ext) return res.status(400).json({ error: 'That file is not a valid image.' });
  saveImage(p.slug, buf, ext);
  res.status(201).json({ images: imagesFor(p.slug) });
});

router.delete('/products/:id/images', (req, res) => {
  const p = productOr404(req, res);
  if (!p) return;
  if (!removeImage(p.slug, cleanFile(req.query.file))) return res.status(404).json({ error: 'Image not found.' });
  res.json({ images: imagesFor(p.slug) });
});

router.post('/products/:id/images/main', (req, res) => {
  const p = productOr404(req, res);
  if (!p) return;
  if (!makeMain(p.slug, cleanFile(req.body.file))) return res.status(404).json({ error: 'Image not found.' });
  res.json({ images: imagesFor(p.slug) });
});

module.exports = router;
module.exports.changeStatus = changeStatus;
module.exports.getStats = getStats;
