// ---------------------------------------------------------------
// lib/pages.js  ->  HTML pages ko serve karne se pehle thoda "pakana"
//   {{HEAD}}    favicon, theme colour, fonts (self-hosted ho toh wahi, warna Google)
//   {{HEADER}}  {{FOOTER}}   server-side header/footer
//   css/js links pe ?v=BUILD  -> isse inhe 1 saal ki cache de sakte hain, badlav pe URL badal jata hai
//   /img/lifestyle/... pe ?v=file-ka-time
// ---------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { headerHTML, footerHTML } = require('./layout');

const PUBLIC = path.join(__dirname, '..', 'public');

function newest(dirs) {
  let m = 0;
  for (const d of dirs) {
    try {
      for (const f of fs.readdirSync(path.join(PUBLIC, d))) {
        m = Math.max(m, fs.statSync(path.join(PUBLIC, d, f)).mtimeMs);
      }
    } catch (e) { /* folder na ho toh chalega */ }
  }
  return Math.floor(m / 1000).toString(36);
}
const BUILD = newest(['css', 'js']);

const exists = (rel) => fs.existsSync(path.join(PUBLIC, rel));

function fontsHTML() {
  if (exists('fonts/fonts.css')) {
    let preload = '';
    try {
      preload = fs.readdirSync(path.join(PUBLIC, 'fonts'))
        .filter((f) => f.endsWith('-latin.woff2'))
        .map((f) => `<link rel="preload" href="/fonts/${f}" as="font" type="font/woff2" crossorigin>`)
        .join('\n');
    } catch (e) { /* ignore */ }
    return `${preload}\n<link rel="stylesheet" href="/fonts/fonts.css?v=${BUILD}">`;
  }
  // `npm run assets` abhi chala nahi: Google Fonts se kaam chalao
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&family=DM+Mono:wght@400;500&display=swap">`;
}

function headHTML() {
  return `<meta name="theme-color" content="#FBF8F6">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${exists('vendor/lenis.min.js') ? '<meta name="ee-smooth" content="1">\n' : ''}${fontsHTML()}`;
}

const raw = new Map();
function readPage(name) {
  if (!raw.has(name) || process.env.NODE_ENV !== 'production') {
    raw.set(name, fs.readFileSync(path.join(PUBLIC, name + '.html'), 'utf8'));
  }
  return raw.get(name);
}

function renderPage(name, req) {
  let html = readPage(name);
  html = html
    .replace('{{HEAD}}', headHTML())
    .replace('{{HEADER}}', headerHTML(req))
    .replace('{{FOOTER}}', footerHTML())
    // css/js ko versioned URL do
    .replace(/(href|src)="(\/(?:css|js)\/[^"?]+)"/g, `$1="$2?v=${BUILD}"`)
    // lifestyle images: file ka time jodo (photo badle toh naya URL)
    .replace(/\/img\/(lifestyle\/[A-Za-z0-9._-]+)\?w=(\d+)(?!&v=)/g, (m, file, w) => {
      let v = 0;
      try { v = Math.floor(fs.statSync(path.join(PUBLIC, 'images', file)).mtimeMs / 1000); } catch (e) { /* ignore */ }
      return `/img/${file}?w=${w}&v=${v}&f=2`;
    });
  return html;
}

module.exports = { renderPage, BUILD, PUBLIC };
