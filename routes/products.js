// ---------------------------------------------------------------
// routes/products.js
//   Public : list (search + filters + sort), meta (filter options), single product
//   Admin  : create, update, delete  (requireAuth + requireAdmin)
// ---------------------------------------------------------------
const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { withImages } = require('../lib/images');
const { ratingCols } = require('../lib/sql');

const router = express.Router();

const CATEGORIES = ['Sunglasses', 'Eyeglasses', 'Screen Glasses'];

// Sort ke options WHITELIST mein hain (user ka text kabhi seedha SQL mein nahi jaata)
const SORTS = {
  featured: 'featured DESC, id ASC',
  newest: 'id DESC',
  price_asc: 'price ASC, id ASC',
  price_desc: 'price DESC, id ASC',
  name: 'name COLLATE NOCASE ASC',
  rating: 'rating DESC, reviewCount DESC, id ASC'
};

const toList = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

// ---------------------- GET /api/products/meta ----------------------
// Shop page ke filter options (aur kitne products har option mein hain)
router.get('/meta', (req, res) => {
  const distinct = (col) =>
    db.prepare(
      `SELECT ${col} AS value, COUNT(*) AS count FROM products
       WHERE ${col} IS NOT NULL AND ${col} != '' GROUP BY ${col} ORDER BY ${col}`
    ).all();

  const price = db.prepare('SELECT MIN(price) AS min, MAX(price) AS max FROM products').get();

  res.json({
    categories: CATEGORIES.map((name) => ({
      value: name,
      count: db.prepare('SELECT COUNT(*) AS c FROM products WHERE category = ?').get(name).c
    })),
    shapes: distinct('shape'),
    materials: distinct('material'),
    genders: distinct('gender'),
    price
  });
});

// ---------------------- GET /api/products ----------------------
// Example: /api/products?q=round&category=Sunglasses,Eyeglasses&maxPrice=8000&sort=price_asc
router.get('/', (req, res) => {
  const where = [];
  const params = [];

  const q = String(req.query.q || '').trim();
  if (q) {
    const like = `%${q}%`;
    where.push('(name LIKE ? OR description LIKE ? OR category LIKE ? OR shape LIKE ? OR material LIKE ? OR color LIKE ?)');
    params.push(like, like, like, like, like, like);
  }

  for (const key of ['category', 'shape', 'material']) {
    const values = toList(req.query[key]);
    if (values.length) {
      where.push(`${key} IN (${values.map(() => '?').join(',')})`);
      params.push(...values);
    }
  }

  // Gender: "Men" chuno toh Unisex frames bhi dikhne chahiye (wo sabko fit hote hain)
  const genders = toList(req.query.gender);
  if (genders.length) {
    if (!genders.includes('Unisex')) genders.push('Unisex');
    where.push(`gender IN (${genders.map(() => '?').join(',')})`);
    params.push(...genders);
  }

  const minPrice = Number(req.query.minPrice);
  const maxPrice = Number(req.query.maxPrice);
  if (req.query.minPrice !== undefined && req.query.minPrice !== '' && Number.isFinite(minPrice)) {
    where.push('price >= ?');
    params.push(minPrice);
  }
  if (req.query.maxPrice !== undefined && req.query.maxPrice !== '' && Number.isFinite(maxPrice)) {
    where.push('price <= ?');
    params.push(maxPrice);
  }

  if (req.query.featured === '1') where.push('featured = 1');

  const orderBy = SORTS[req.query.sort] || SORTS.featured;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 60, 1), 100);

  const sql =
    `SELECT *, ${ratingCols('products')} FROM products ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${orderBy} LIMIT ?`;
  const products = db.prepare(sql).all(...params, limit);

  res.json({ count: products.length, products: products.map(withImages) });
});

// ---------------------- GET /api/products/:idOrSlug ----------------------
router.get('/:idOrSlug', (req, res) => {
  const key = req.params.idOrSlug;
  const product = /^\d+$/.test(key)
    ? db.prepare(`SELECT *, ${ratingCols('products')} FROM products WHERE id = ?`).get(Number(key))
    : db.prepare(`SELECT *, ${ratingCols('products')} FROM products WHERE slug = ?`).get(key);

  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product: withImages(product) });
});

// ---------------------- ADMIN: validation helper ----------------------
function validateProduct(body, existing = {}) {
  const p = {
    name: String(body.name ?? existing.name ?? '').trim(),
    category: String(body.category ?? existing.category ?? '').trim(),
    price: Number(body.price ?? existing.price),
    description: String(body.description ?? existing.description ?? '').trim(),
    shape: String(body.shape ?? existing.shape ?? '').trim(),
    material: String(body.material ?? existing.material ?? '').trim(),
    gender: String(body.gender ?? existing.gender ?? '').trim(),
    color: String(body.color ?? existing.color ?? '').trim(),
    stock: Number(body.stock ?? existing.stock ?? 0),
    image1: String(body.image1 ?? existing.image1 ?? '').trim(),
    image2: String(body.image2 ?? existing.image2 ?? '').trim(),
    featured: body.featured !== undefined ? (body.featured ? 1 : 0) : (existing.featured || 0)
  };

  if (p.name.length < 2) return { error: 'Product name is required.' };
  if (!CATEGORIES.includes(p.category)) return { error: `Category must be one of: ${CATEGORIES.join(', ')}.` };
  if (!Number.isInteger(p.price) || p.price <= 0) return { error: 'Price must be a whole number above 0.' };
  if (!Number.isInteger(p.stock) || p.stock < 0) return { error: 'Stock must be 0 or more.' };
  return { product: p };
}

function makeSlug(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product';
  let slug = base;
  let n = 2;
  while (db.prepare('SELECT id FROM products WHERE slug = ?').get(slug)) slug = `${base}-${n++}`;
  return slug;
}

// ---------------------- POST /api/products  (admin) ----------------------
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { error, product: p } = validateProduct(req.body);
  if (error) return res.status(400).json({ error });

  const slug = makeSlug(p.name);
  if (!p.image1) p.image1 = `/images/products/${slug}-1.jpg`;
  if (!p.image2) p.image2 = `/images/products/${slug}-2.jpg`;

  const info = db.prepare(`
    INSERT INTO products (name, slug, category, price, description, shape, material, gender, color, stock, image1, image2, featured)
    VALUES (@name, @slug, @category, @price, @description, @shape, @material, @gender, @color, @stock, @image1, @image2, @featured)
  `).run({ ...p, slug });

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ product: withImages(created) });
});

// ---------------------- PUT /api/products/:id  (admin) ----------------------
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Product not found.' });

  const { error, product: p } = validateProduct(req.body, existing);
  if (error) return res.status(400).json({ error });

  db.prepare(`
    UPDATE products SET name=@name, category=@category, price=@price, description=@description, shape=@shape,
      material=@material, gender=@gender, color=@color, stock=@stock, image1=@image1, image2=@image2, featured=@featured
    WHERE id=@id
  `).run({ ...p, id: existing.id });

  res.json({ product: withImages(db.prepare('SELECT * FROM products WHERE id = ?').get(existing.id)) });
});

// ---------------------- DELETE /api/products/:id  (admin) ----------------------
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const info = db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
    if (!info.changes) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    // Agar product kisi purane order mein hai toh delete nahi ho sakta (order history safe rehti hai)
    res.status(409).json({ error: 'This product is part of past orders. Set its stock to 0 instead of deleting it.' });
  }
});

module.exports = router;
