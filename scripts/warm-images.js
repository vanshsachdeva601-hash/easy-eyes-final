// ---------------------------------------------------------------
// scripts/warm-images.js  ->  `npm run warm`
// Saari photos ke chhote WebP versions pehle se bana deta hai.
// Lighthouse chalane se PEHLE ek baar chalao, warna pehli baar photo banne mein time lagta hai aur score kam aata hai.
// ---------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { ROOT, WIDTHS, ensureVariant, hasSharp } = require('../lib/imgCache');

const EXT = /\.(jpe?g|png|webp|avif)$/i;
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}

(async () => {
  if (!hasSharp()) { console.log('sharp install nahi hai, `npm install` chalao.'); return; }
  if (!fs.existsSync(ROOT)) { console.log('public/images folder nahi mila.'); return; }
  const files = walk(ROOT).filter((f) => EXT.test(f));
  let made = 0;
  for (const abs of files) {
    const rel = path.relative(ROOT, abs);
    const st = fs.statSync(abs);
    for (const w of WIDTHS) {
      try { await ensureVariant(rel, st, w); made++; } catch (e) { console.warn('Skip:', rel, w, e.message); }
    }
  }
  console.log(`Done: ${files.length} photos, ${made} versions ready.`);
})();
