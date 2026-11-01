// ---------------------------------------------------------------
// lib/layout.js  ->  header + footer ka HTML (server pe banta hai)
// Pehle ye JS se page banne ke BAAD judta tha (layout shift + der). Ab HTML ke saath hi aata hai.
// ---------------------------------------------------------------
const CATS = [
  ['Sunglasses', 'Sunglasses'],
  ['Eyeglasses', 'Eyeglasses'],
  ['Screen Glasses', 'Screen glasses']
];

function headerHTML(req) {
  const page = req.path;
  const cat = String(req.query.category || '');
  const cur = (on) => (on ? ' aria-current="page"' : '');
  const shopAll = page === '/shop.html' && !Object.keys(req.query).length;

  return `
<a class="skip-link" href="#main">Skip to content</a>
<div class="announce">Free shipping across India. 30-day easy returns.</div>
<header class="site-header">
  <div class="inner">
    <a class="logo" href="/" aria-label="Easy Eyes home">Easy Eyes</a>
    <nav class="nav" id="nav" aria-label="Main">
      <a href="/shop.html"${cur(shopAll)}>Shop all</a>
      ${CATS.map(([v, label]) => `<a href="/shop.html?category=${encodeURIComponent(v)}"${cur(page === '/shop.html' && cat === v)}>${label}</a>`).join('\n      ')}
      <a class="nav-extra" href="/wishlist.html">Wishlist</a>
      <a class="nav-extra" href="/orders.html">My orders</a>
    </nav>
    <form class="hsearch" action="/shop.html" method="get" role="search">
      <label class="visually-hidden" for="hq">Search eyewear</label>
      <input id="hq" name="q" type="search" placeholder="Search for eyewear" autocomplete="off">
    </form>
    <div class="actions">
      <a class="wish-link" href="/wishlist.html">Wishlist<span class="cart-count" id="wish-count"></span></a>
      <span id="auth-slot"><a href="/login.html">Log in</a></span>
      <a class="cart-link" href="/cart.html">Cart<span class="cart-count" id="cart-count"></span></a>
      <button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="nav">Menu</button>
    </div>
  </div>
</header>`;
}

function footerHTML() {
  return `
<section class="news dark" aria-labelledby="news-title">
  <h2 class="display" id="news-title">Stay up to date on new frames</h2>
  <form class="news-form" id="news-form" novalidate>
    <label class="visually-hidden" for="news-email">Email address</label>
    <input id="news-email" type="email" placeholder="Enter your email" autocomplete="email" required>
    <button class="btn btn-white" type="submit">Subscribe</button>
  </form>
  <p class="news-msg" id="news-msg" role="status"></p>
</section>
<footer class="footer">
  <div class="footer-grid">
    <div>
      <div class="footer-word">Easy<br>Eyes</div>
      <p class="footer-blurb">Sunglasses, eyeglasses and screen glasses in acetate, metal and titanium. Made to be worn every day.</p>
    </div>
    <div class="footer-col">
      <h3>Shop</h3>
      <ul>
        <li><a href="/shop.html">All frames</a></li>
        <li><a href="/shop.html?category=Sunglasses">Sunglasses</a></li>
        <li><a href="/shop.html?category=Eyeglasses">Eyeglasses</a></li>
        <li><a href="/shop.html?category=Screen%20Glasses">Screen glasses</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h3>Promise</h3>
      <ul>
        <li><span class="footer-note">Free shipping across India</span></li>
        <li><span class="footer-note">30-day easy returns</span></li>
        <li><span class="footer-note">1-year warranty</span></li>
      </ul>
    </div>
    <div class="footer-col">
      <h3>Account</h3>
      <ul>
        <li><a href="/login.html">Log in or sign up</a></li>
        <li><a href="/wishlist.html">Wishlist</a></li>
        <li><a href="/cart.html">Cart</a></li>
        <li><a href="/orders.html">My orders</a></li>
      </ul>
    </div>
  </div>
  <div class="copyright"><span>&copy; ${new Date().getFullYear()} Easy Eyes. Demo store, no real orders.</span><span>Made in India</span></div>
</footer>`;
}

module.exports = { headerHTML, footerHTML };
