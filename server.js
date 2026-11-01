// ---------------------------------------------------------------
// server.js  ->  Poori app ka entry point. "npm start" yahi file chalata hai.
// ---------------------------------------------------------------
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { renderPage, PUBLIC } = require('./lib/pages');

let compression = null;
try { compression = require('compression'); } catch (e) { console.warn('Note: "compression" install nahi hai. `npm install` chalao.'); }

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: .env mein JWT_SECRET nahi mila. Temporary dev secret use ho raha hai.');
}

require('./db'); // database + tables + seed data ready

const app = express();
const PORT = process.env.PORT || 3000;
app.disable('x-powered-by');

if (compression) app.use(compression()); // gzip: HTML/CSS/JS/JSON chhote hoke jaate hain
app.use(express.json({ limit: '12mb' })); // JSON body (admin photo upload ke liye bada limit)
app.use(cookieParser());

// ---------- HTML pages (header/footer server pe judte hain) ----------
function page(req, res, next) {
  const name = req.params.page || 'index';
  if (!/^[a-z0-9-]+$/i.test(name) || !fs.existsSync(path.join(PUBLIC, name + '.html'))) return next();
  res.set('Cache-Control', 'no-cache'); // har baar check, par ETag se 304 (bahut halka)
  res.type('html').send(renderPage(name, req));
}
app.get(['/', '/index.html'], (req, res, next) => { req.params.page = 'index'; page(req, res, next); });
app.get('/:page.html', page);

// ---------- photos: chhoti + WebP ----------
app.use('/img', require('./routes/img'));

// ---------- static files (versioned hain, isliye lambi cache) ----------
const longCache = { maxAge: '365d', immutable: true };
app.use('/css', express.static(path.join(PUBLIC, 'css'), longCache));
app.use('/js', express.static(path.join(PUBLIC, 'js'), longCache));
app.use('/fonts', express.static(path.join(PUBLIC, 'fonts'), longCache));
app.use('/vendor', express.static(path.join(PUBLIC, 'vendor'), longCache));
app.use('/images', express.static(path.join(PUBLIC, 'images'), { maxAge: '30d' }));
app.use(express.static(PUBLIC, { index: false, maxAge: '1d' })); // favicon, robots.txt

// ---------- API ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Easy Eyes' }));
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

// ---------- 404 page ----------
app.use((req, res) => {
  res.status(404).type('html').send(renderPage('404', req));
});

// Koi bhi unexpected error yahan pakda jayega
app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api')) return res.status(500).json({ error: 'Something went wrong on the server.' });
  res.status(500).send('Something went wrong.');
});

app.listen(PORT, () => {
  console.log(`Easy Eyes server chal raha hai: http://localhost:${PORT}`);
});
