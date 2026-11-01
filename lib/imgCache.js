// ---------------------------------------------------------------
// lib/imgCache.js  ->  photo ke chhote WebP versions banana + disk pe cache karna
// routes/img.js (live requests) aur scripts/warm-images.js (pehle se bana lena) dono yahi use karte hain.
// ---------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let sharp = null;
try {
  sharp = require('sharp');
  sharp.cache({ files: 0 });
} catch (e) {
  console.warn('Note: "sharp" install nahi hai, photos original size mein jayengi. `npm install` chalao.');
}

const ROOT = path.join(__dirname, '..', 'public', 'images');
const CACHE = path.join(__dirname, '..', '.cache', 'img');
const WIDTHS = [160, 240, 320, 480, 640, 800, 1200, 1600];
const inflight = new Map();

// Chhota version (width = w) ka path; nahi bana toh abhi bana deta hai. sharp na ho toh null.
async function ensureVariant(rel, st, w) {
  if (!sharp) return null;
  const key = crypto.createHash('sha1').update(`${rel}|${st.mtimeMs}|${st.size}|${w}`).digest('hex').slice(0, 20);
  const out = path.join(CACHE, key + '.webp');
  if (fs.existsSync(out)) return out;
  if (!inflight.has(key)) {
    inflight.set(key, (async () => {
      fs.mkdirSync(CACHE, { recursive: true });
      const tmp = `${out}.${process.pid}.tmp`;
      await sharp(path.join(ROOT, rel)).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(tmp);
      fs.renameSync(tmp, out);
    })().finally(() => inflight.delete(key)));
  }
  await inflight.get(key);
  return out;
}

module.exports = { ROOT, WIDTHS, ensureVariant, hasSharp: () => !!sharp };
