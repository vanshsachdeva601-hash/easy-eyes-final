// ---------------------------------------------------------------
// lib/images.js  ->  product ki saari photos folder se apne aap dhundta hai
//
// Bas files is naam se public/images/products/ mein daal do:
//    aria-1.jpg  aria-2.jpg  aria-3.png  ...  aria-7.webp   (aria_3.jpg ya "aria 3.jpg" bhi chalta hai)
// Kitni bhi photos ho sakti hain (jpg, jpeg, png, webp, avif), numbering se order banta hai.
// Admin panel se upload karne par bhi yahi naming use hoti hai.
// ---------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'images', 'products');
let cache = { at: 0, files: [] };

function files() {
  const now = Date.now();
  if (now - cache.at > 1500) { // har request pe disk nahi padhte
    try {
      cache.files = fs.readdirSync(DIR).map((name) => {
        let v = 0; // file ka time: photo badle toh URL badal jata hai (browser cache ke liye)
        try { v = Math.floor(fs.statSync(path.join(DIR, name)).mtimeMs / 1000); } catch (e) { /* ignore */ }
        return { name, v };
      });
    } catch (e) { cache.files = []; }
    cache.at = now;
  }
  return cache.files;
}
function invalidate() { cache.at = 0; }

// [{ n, f (file name), ext }] numbering ke order mein
function entries(slug) {
  const safe = String(slug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + safe + '[-_ ]0*(\\d+)\\.(jpe?g|png|webp|avif)$', 'i');
  return files()
    .map(({ name: f, v }) => { const m = f.match(re); return m ? { n: Number(m[1]), f, ext: m[2].toLowerCase(), v } : null; })
    .filter(Boolean)
    .sort((a, b) => a.n - b.n);
}

function imagesFor(slug) {
  return entries(slug).map((x) => `/images/products/${x.f}?v=${x.v}`);
}

// Product object mein images[] jodta hai, aur image1/image2 ko asli files se match karta hai
function withImages(p) {
  const images = imagesFor(p.slug);
  if (images.length) return { ...p, images, image1: images[0], image2: images[1] || null };
  return { ...p, images: [p.image1, p.image2].filter(Boolean) };
}

// Cart/orders ke liye: pehli photo
function firstImage(slug, fallback) {
  return imagesFor(slug)[0] || fallback || null;
}

// ---------- admin ke liye: save / delete / "make main" ----------
function saveImage(slug, buf, ext) {
  fs.mkdirSync(DIR, { recursive: true });
  const list = entries(slug);
  const next = (list.length ? Math.max(...list.map((x) => x.n)) : 0) + 1;
  const name = `${slug}-${next}.${ext}`;
  fs.writeFileSync(path.join(DIR, name), buf);
  invalidate();
  return name;
}

function removeImage(slug, file) {
  const hit = entries(slug).find((x) => x.f === file); // sirf is product ki apni files delete ho sakti hain
  if (!hit) return false;
  fs.unlinkSync(path.join(DIR, hit.f));
  invalidate();
  return true;
}

// Chuni hui photo ko #1 bana do, baaki ko 2, 3, 4... mein renumber karo
function makeMain(slug, file) {
  const list = entries(slug);
  const sel = list.find((x) => x.f === file);
  if (!sel) return false;
  const ordered = [sel, ...list.filter((x) => x !== sel)];
  ordered.forEach((x, i) => fs.renameSync(path.join(DIR, x.f), path.join(DIR, `__tmp_${i}.${x.ext}`)));
  ordered.forEach((x, i) => fs.renameSync(path.join(DIR, `__tmp_${i}.${x.ext}`), path.join(DIR, `${slug}-${i + 1}.${x.ext}`)));
  invalidate();
  return true;
}

module.exports = { imagesFor, withImages, firstImage, saveImage, removeImage, makeMain, invalidate };
