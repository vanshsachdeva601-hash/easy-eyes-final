// ---------------------------------------------------------------
// routes/orders.js  ->  checkout aur orders
//   POST /api/orders       cart se order banao (address + payment method)
//   GET  /api/orders       meri saari orders
//   GET  /api/orders/:id   ek order ki detail (sirf apni, admin ko sab)
//
// Order banate waqt saari cheezein ek TRANSACTION mein hoti hain:
// agar beech mein kuch fail ho jaye toh poora order cancel, kuch adhura save nahi hota.
// Price hamesha server khud database se leta hai (browser pe bharosa nahi).
// ---------------------------------------------------------------
const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { firstImage } = require('../lib/images');

const router = express.Router();
router.use(requireAuth);

class OrderError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function validate(body) {
  const o = {
    name: String(body.name || '').trim(),
    phone: String(body.phone || '').replace(/[\s-]/g, ''),
    address: String(body.address || '').trim(),
    city: String(body.city || '').trim(),
    pincode: String(body.pincode || '').trim(),
    paymentMethod: body.paymentMethod === 'online' ? 'online' : 'cod'
  };
  if (o.name.length < 2) return { error: 'Please enter your full name.' };
  if (!/^\d{10}$/.test(o.phone)) return { error: 'Enter a 10-digit phone number.' };
  if (o.address.length < 5) return { error: 'Please enter your full address.' };
  if (o.city.length < 2) return { error: 'Please enter your city.' };
  if (!/^\d{6}$/.test(o.pincode)) return { error: 'Enter a 6-digit pincode.' };
  return { order: o };
}

const place = db.transaction((userId, o) => {
  const items = db.prepare(`
    SELECT c.product_id, c.quantity, p.name, p.price, p.stock
    FROM cart_items c JOIN products p ON p.id = c.product_id
    WHERE c.user_id = ?
  `).all(userId);

  if (!items.length) throw new OrderError('Your cart is empty.');

  let total = 0;
  for (const i of items) {
    if (i.quantity > i.stock) {
      throw new OrderError(`${i.name}: only ${i.stock} left in stock. Please update your cart.`, 409);
    }
    total += i.price * i.quantity;
  }

  // "online" = demo payment (koi asli paisa nahi kat'ta). COD = delivery pe payment.
  const paid = o.paymentMethod === 'online';
  const info = db.prepare(`
    INSERT INTO orders (user_id, total, status, payment_status, payment_id, payment_method,
                        shipping_name, shipping_phone, shipping_address, shipping_city, shipping_pincode)
    VALUES (?, ?, 'placed', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId, total, paid ? 'paid' : 'pending',
    paid ? 'TEST-' + crypto.randomBytes(5).toString('hex').toUpperCase() : null,
    o.paymentMethod, o.name, o.phone, o.address, o.city, o.pincode
  );
  const orderId = Number(info.lastInsertRowid);

  const addItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
  const reduceStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
  for (const i of items) {
    addItem.run(orderId, i.product_id, i.quantity, i.price);
    if (reduceStock.run(i.quantity, i.product_id, i.quantity).changes === 0) {
      throw new OrderError(`${i.name} just went out of stock.`, 409);
    }
  }

  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
  return orderId;
});

function itemsFor(orderId) {
  return db.prepare(`
    SELECT oi.product_id AS productId, oi.quantity, oi.price, p.name, p.slug, p.image1
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ? ORDER BY oi.id
  `).all(orderId).map((i) => ({ ...i, image1: firstImage(i.slug, i.image1) }));
}

router.post('/', (req, res) => {
  const { error, order } = validate(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const id = place(req.user.id, order);
    res.status(201).json({ id });
  } catch (err) {
    if (err instanceof OrderError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Could not place the order. Please try again.' });
  }
});

router.get('/', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id)
    .map((o) => ({ ...o, items: itemsFor(o.id) }));
  res.json({ orders });
});

router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id));
  if (!order || (order.user_id !== req.user.id && req.user.role !== 'admin')) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  res.json({ order: { ...order, items: itemsFor(order.id) } });
});

module.exports = router;
module.exports.place = place;
module.exports.itemsFor = itemsFor;
