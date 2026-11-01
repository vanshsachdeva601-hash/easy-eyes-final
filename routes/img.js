// ---------------------------------------------------------------
// routes/img.js  ->  /img/products/aria-1.jpg?w=640
// Badi photo ko chhota (width = w) aur WebP banake deta hai, aur disk pe cache karta hai.
// Isse page par 3-5 MB ki photo ki jagah 30-80 KB ki photo jaati hai (Lighthouse ke liye sabse bada fayda).
// `sharp` install nahi hai toh original photo hi serve hoti hai (site tab bhi chalti hai).
// ---------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const express = require('express');
const { ROOT, WIDTHS, ensureVariant } = require('../lib/imgCache');

const router = express.Router();
const EXT = /\.(jpe?g|png|webp|avif)$/i;

router.get('/*', async (req, res) => {
  const rel = path.normalize(String(req.params[0] || ''));
  const abs = path.join(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) || !EXT.test(abs)) return res.status(400).end();

  let st;
  try {
    st = fs.statSync(abs);
    if (!st.isFile()) throw new Error('not a file');
  } catch (e) {
    return res.status(404).end();
  }

  // ?v=... URL mein hai toh URL file ke saath badalta hai, isliye 1 saal ki cache safe hai
  // (header sirf tab lagta hai jab file sach mein chali jaye, error pe nahi)
  const headers = { 'Cache-Control': req.query.v ? 'public, max-age=31536000, immutable' : 'public, max-age=2592000' };

  const wanted = Number(req.query.w) || 800;
  const w = WIDTHS.find((x) => x >= wanted) || WIDTHS[WIDTHS.length - 1];

  try {
    const variant = await ensureVariant(rel, st, w);
    // dotfiles: 'allow' zaroori hai, kyunki chhoti photos ".cache" folder mein rehti hain (naam dot se shuru),
    // aur Express by default aise path ko 404 bana deta hai
    res.sendFile(variant || abs, { headers, cacheControl: false, dotfiles: 'allow' });
  } catch (err) {
    console.error('Image error:', rel, err.message);
    res.sendFile(abs, { headers, cacheControl: false, dotfiles: 'allow' });
  }
});

module.exports = router;
