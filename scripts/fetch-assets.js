// ---------------------------------------------------------------
// scripts/fetch-assets.js  ->  `npm install` ya `npm run assets` se chalta hai (internet chahiye)
//   1) Google Fonts ko download karke apne server se serve karta hai (fonts.css + .woff2)
//   2) Lenis (smooth scroll) ki file download karta hai
// Fail ho jaye toh bhi install nahi rukta; site Google Fonts se kaam chalati rahegi.
// ---------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const FONTS = path.join(PUBLIC, 'fonts');
const VENDOR = path.join(PUBLIC, 'vendor');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&family=DM+Mono:wght@400;500&display=swap';
const LENIS_URL = 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js';

async function get(url, asText) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return asText ? res.text() : Buffer.from(await res.arrayBuffer());
}

async function fonts() {
  if (fs.existsSync(path.join(FONTS, 'fonts.css'))) return console.log('Fonts: pehle se hain.');
  fs.mkdirSync(FONTS, { recursive: true });
  const css = await get(CSS_URL, true);
  let out = '';
  for (const block of css.split('/* ').slice(1)) {
    const subset = block.slice(0, block.indexOf(' */'));
    if (subset !== 'latin' && subset !== 'latin-ext') continue; // sirf English + rupee symbol wale hisse
    const family = /font-family:\s*'([^']+)'/.exec(block)[1];
    const weight = /font-weight:\s*([^;]+);/.exec(block)[1].trim().replace(/\s+/g, '-');
    const url = /url\(([^)]+)\)/.exec(block)[1];
    const file = `${family.toLowerCase().replace(/\s+/g, '-')}-${weight}-${subset}.woff2`;
    fs.writeFileSync(path.join(FONTS, file), await get(url));
    out += '@font-face' + block.slice(block.indexOf('{') - 1).replace(url, `/fonts/${file}`).replace(/\s*\/\*[\s\S]*$/, '') + '\n';
  }
  if (!out) throw new Error('Font CSS parse nahi hui');
  fs.writeFileSync(path.join(FONTS, 'fonts.css'), out);
  console.log('Fonts: download ho gaye (public/fonts).');
}

async function lenis() {
  const file = path.join(VENDOR, 'lenis.min.js');
  if (fs.existsSync(file)) return console.log('Lenis: pehle se hai.');
  fs.mkdirSync(VENDOR, { recursive: true });
  fs.writeFileSync(file, await get(LENIS_URL));
  console.log('Lenis: download ho gaya (public/vendor).');
}

(async () => {
  for (const [name, job] of [['Fonts', fonts], ['Lenis', lenis]]) {
    try { await job(); } catch (e) { console.warn(`${name}: download nahi hua (${e.message}). Site fir bhi chalegi.`); }
  }
})();
