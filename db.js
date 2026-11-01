// ---------------------------------------------------------------
// db.js  ->  Database connection + saari tables (schema) + seed data
// SQLite ek file (easy-eyes.db) mein sab kuch store karta hai.
// ---------------------------------------------------------------
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, 'easy-eyes.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON'); // foreign keys ko enforce karo

// ---------------------- SCHEMA ----------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL,            -- Sunglasses | Eyeglasses | Screen Glasses
  price       INTEGER NOT NULL,         -- rupees mein (paise nahi)
  description TEXT NOT NULL DEFAULT '',
  shape       TEXT,                     -- Aviator, Round, Wayfarer...
  material    TEXT,                     -- Acetate, Metal, Titanium
  gender      TEXT,                     -- Men | Women | Unisex
  color       TEXT,
  stock       INTEGER NOT NULL DEFAULT 0,
  image1      TEXT,
  image2      TEXT,
  featured    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  total            INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'placed'
                   CHECK (status IN ('placed','processing','shipped','delivered','cancelled')),
  payment_status   TEXT NOT NULL DEFAULT 'pending'
                   CHECK (payment_status IN ('pending','paid','failed')),
  payment_id       TEXT,
  payment_method   TEXT NOT NULL DEFAULT 'cod',
  shipping_name    TEXT NOT NULL,
  shipping_phone   TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city    TEXT NOT NULL,
  shipping_pincode TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL,
  price      INTEGER NOT NULL            -- kharidte waqt ka price (baad mein badle toh bhi safe)
);

CREATE TABLE IF NOT EXISTS wishlist (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_cart_user         ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user       ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product   ON reviews(product_id);
`);

// Purane database mein payment_method column nahi hota, toh use jod do (migration)
const orderCols = db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name);
if (!orderCols.includes('payment_method')) {
  db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cod'");
}

// ---------------------- SEED DATA ----------------------
// Pehli baar server chalne pe admin user + 15 products apne aap ban jaate hain.
const SEED_PRODUCTS = [
  // ---- Sunglasses ----
  { name: 'Aria',     category: 'Sunglasses',    price: 8999,  shape: 'Aviator',   material: 'Metal',    gender: 'Unisex', color: 'Gold',        stock: 25, featured: 1,
    description: 'A slim metal aviator with gradient green lenses and a featherlight finish. Made for long, bright afternoons.' },
  { name: 'Noir',     category: 'Sunglasses',    price: 6999,  shape: 'Wayfarer',  material: 'Acetate',  gender: 'Unisex', color: 'Black',       stock: 30, featured: 1,
    description: 'Bold, glossy black acetate with a confident silhouette. The one frame that goes with everything.' },
  { name: 'Solstice', category: 'Sunglasses',    price: 7499,  shape: 'Round',     material: 'Acetate',  gender: 'Women',  color: 'Tortoise',    stock: 20, featured: 0,
    description: 'Hand-polished tortoise acetate in a soft round shape, with UV400 tinted lenses.' },
  { name: 'Meridian', category: 'Sunglasses',    price: 9499,  shape: 'Cat-eye',   material: 'Acetate',  gender: 'Women',  color: 'Amber',       stock: 15, featured: 1,
    description: 'A sharp cat-eye in warm amber acetate. Quietly dramatic, never loud.' },
  { name: 'Vesper',   category: 'Sunglasses',    price: 12999, shape: 'Rectangle', material: 'Titanium', gender: 'Men',    color: 'Gunmetal',    stock: 12, featured: 0,
    description: 'Ultra-light titanium frame with polarised lenses. Built to last and to be forgotten on your face.' },
  // ---- Eyeglasses ----
  { name: 'Atlas',    category: 'Eyeglasses',    price: 11999, shape: 'Rectangle', material: 'Titanium', gender: 'Men',    color: 'Matte Black', stock: 18, featured: 1,
    description: 'Architectural lines in brushed titanium. A serious frame for serious mornings.' },
  { name: 'Linea',    category: 'Eyeglasses',    price: 5999,  shape: 'Round',     material: 'Metal',    gender: 'Unisex', color: 'Silver',      stock: 28, featured: 0,
    description: 'A fine silver wire round that sits light and looks effortless.' },
  { name: 'Halo',     category: 'Eyeglasses',    price: 6499,  shape: 'Cat-eye',   material: 'Acetate',  gender: 'Women',  color: 'Clear Rose',  stock: 22, featured: 0,
    description: 'Translucent rose acetate with a subtle upswept edge. Soft, but unmistakable.' },
  { name: 'Sable',    category: 'Eyeglasses',    price: 5499,  shape: 'Wayfarer',  material: 'Acetate',  gender: 'Men',    color: 'Havana',      stock: 26, featured: 0,
    description: 'Classic havana wayfarer with a warm, layered finish and spring hinges for all-day comfort.' },
  { name: 'Orion',    category: 'Eyeglasses',    price: 8499,  shape: 'Hexagon',   material: 'Metal',    gender: 'Unisex', color: 'Rose Gold',   stock: 14, featured: 1,
    description: 'A geometric hexagon in polished rose gold. For people who like their details noticed slowly.' },
  // ---- Screen Glasses (blue-light) ----
  { name: 'Lumen',    category: 'Screen Glasses', price: 3999, shape: 'Round',     material: 'Acetate',  gender: 'Unisex', color: 'Clear',       stock: 40, featured: 0,
    description: 'Crystal-clear round frames with a blue-light filter lens. Easier on the eyes, from first email to last.' },
  { name: 'Pixel',    category: 'Screen Glasses', price: 4299, shape: 'Rectangle', material: 'Acetate',  gender: 'Men',    color: 'Navy',        stock: 35, featured: 0,
    description: 'A clean navy rectangle with anti-glare coating, designed for long days at the screen.' },
  { name: 'Drift',    category: 'Screen Glasses', price: 4499, shape: 'Cat-eye',   material: 'Acetate',  gender: 'Women',  color: 'Blush',       stock: 30, featured: 0,
    description: 'Blush-toned cat-eye with blue-light protection. Soft colour, sharp focus.' },
  { name: 'Focus',    category: 'Screen Glasses', price: 4799, shape: 'Wayfarer',  material: 'Metal',    gender: 'Unisex', color: 'Graphite',    stock: 32, featured: 0,
    description: 'Graphite metal wayfarer, lightweight and anti-reflective. Built for the long haul.' },
  { name: 'Zenith',   category: 'Screen Glasses', price: 6999, shape: 'Square',    material: 'Titanium', gender: 'Unisex', color: 'Champagne',   stock: 16, featured: 1,
    description: 'Our lightest screen frame: champagne titanium with a premium blue-cut lens.' }
];

function seed() {
  // Admin user
  const adminEmail = 'admin@easyeyes.com';
  const hasAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!hasAdmin) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@123', 10); // deploy pe ADMIN_PASSWORD env set karo
    db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run('Admin', adminEmail, hash, 'admin');
    console.log('Seed: admin user ban gaya (admin@easyeyes.com / Admin@123)');
  }

  // Products
  const count = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO products
        (name, slug, category, price, description, shape, material, gender, color, stock, image1, image2, featured)
      VALUES
        (@name, @slug, @category, @price, @description, @shape, @material, @gender, @color, @stock, @image1, @image2, @featured)
    `);
    const insertAll = db.transaction((items) => {
      for (const p of items) {
        const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        insert.run({
          ...p,
          slug,
          image1: `/images/products/${slug}-1.jpg`,
          image2: `/images/products/${slug}-2.jpg`
        });
      }
    });
    insertAll(SEED_PRODUCTS);
    console.log(`Seed: ${SEED_PRODUCTS.length} products add ho gaye`);
  }
}

seed();

module.exports = db;
