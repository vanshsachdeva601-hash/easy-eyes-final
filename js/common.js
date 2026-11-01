// ---------------------------------------------------------------
// common.js  ->  har page pe chalta hai
//   header + footer, smooth scroll, product card, helpers
// ---------------------------------------------------------------
(function () {
  const EE = (window.EE = {});

  // ---------- helpers ----------
  EE.fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');
  EE.esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Image load na ho (file abhi daali nahi) toh rang-birangi placeholder dikhao
  window.imgFail = function (el) {
    if (!el.dataset.soft && el.parentElement) el.parentElement.classList.add('is-empty');
    el.remove();
  };
  // Jo static images script load hone se pehle fail ho gayi, unhe dobara check karo
  document.querySelectorAll('img:not([loading="lazy"])').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.parentElement) window.imgFail(img);
  });

  EE.PALETTE = ['#F4C7B8', '#BFE3DF', '#D8CCEE', '#F5E0A8', '#EFBDBB', '#C9DDF2'];
  const SWATCHES = {
    'gold': '#C9A24B', 'black': '#15110F', 'tortoise': '#8A5A2B', 'amber': '#D98A2B', 'gunmetal': '#5B6068',
    'matte black': '#25221F', 'silver': '#C0C4CA', 'clear rose': '#F0C9CC', 'havana': '#7A4A24',
    'rose gold': '#D9A08B', 'clear': '#E9EEF0', 'navy': '#1F2D5A', 'blush': '#F1C6C0', 'graphite': '#4A4D52', 'champagne': '#D8C4A0'
  };
  EE.swatch = (name) => SWATCHES[String(name || '').toLowerCase()] || '#BBBBBB';

  EE.img = (src, alt, extra = '') =>
    src ? `<img src="${EE.esc(src)}" alt="${EE.esc(alt)}" loading="lazy" ${extra} onerror="imgFail(this)">` : '';

  EE.productCard = (p) => `
    <a class="card" href="/product.html?slug=${encodeURIComponent(p.slug)}" aria-label="${EE.esc(p.name)}, ${EE.fmt(p.price)}">
      <div class="card-media ph${p.image1 ? '' : ' is-empty'}" style="--ph:${EE.PALETTE[p.id % EE.PALETTE.length]}">
        ${EE.img(p.image1, p.name + ' frame')}
        ${p.image2 ? `<img class="alt" src="${EE.esc(p.image2)}" alt="" loading="lazy" data-soft="1" onerror="imgFail(this)">` : ''}
      </div>
      <div class="card-info">
        <h3 class="card-name">${EE.esc(p.name)}</h3>
        <span class="card-price">${EE.fmt(p.price)}</span>
      </div>
      <p class="card-meta"><i class="swatch" style="--sw:${EE.swatch(p.color)}"></i><span>${EE.esc(p.category)}, ${EE.esc(p.shape || '')}</span></p>
    </a>`;

  EE.toast = (msg) => {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(EE._toastTimer);
    EE._toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  };

  // Phase 3 mein ye asli cart API se replace hoga
  EE.addToCart = async function () {
    EE.toast('Cart goes live in the next update.');
  };

  // ---------- header + footer ----------
  const path = location.pathname;

  const headerHTML = `
    <div class="announce">Free shipping across India. 30-day easy returns.</div>
    <header class="site-header">
      <div class="inner">
        <a class="logo" href="/" aria-label="Easy Eyes home">Easy Eyes</a>
        <nav class="nav" id="nav" aria-label="Main">
          <a href="/shop.html"${path === '/shop.html' && !location.search ? ' aria-current="page"' : ''}>Shop all</a>
          <a href="/shop.html?category=Sunglasses">Sunglasses</a>
          <a href="/shop.html?category=Eyeglasses">Eyeglasses</a>
          <a href="/shop.html?category=Screen%20Glasses">Screen glasses</a>
        </nav>
        <form class="hsearch" action="/shop.html" method="get" role="search">
          <label class="visually-hidden" for="hq">Search eyewear</label>
          <input id="hq" name="q" type="search" placeholder="Search for eyewear" autocomplete="off">
        </form>
        <div class="actions">
          <a class="search-link" href="/shop.html?focus=1">Search</a>
          <span id="auth-slot"></span>
          <a class="cart-link" href="/cart.html">Cart<span class="cart-count" id="cart-count"></span></a>
          <button class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>
        </div>
      </div>
    </header>`;

  const footerHTML = `
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
            <li><a href="/cart.html">Cart</a></li>
            <li><a href="/orders.html">My orders</a></li>
          </ul>
        </div>
      </div>
      <div class="copyright"><span>&copy; ${new Date().getFullYear()} Easy Eyes. Demo store, no real orders.</span><span>Made in India</span></div>
    </footer>`;

  const headerSlot = document.getElementById('site-header');
  const footerSlot = document.getElementById('site-footer');
  if (headerSlot) headerSlot.innerHTML = headerHTML;
  if (footerSlot) {
    footerSlot.innerHTML = footerHTML;
    document.getElementById('news-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('news-email');
      const msg = document.getElementById('news-msg');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        msg.textContent = 'Enter a valid email address.';
        return;
      }
      msg.textContent = 'Thanks. You are on the list.';
      email.value = '';
    });
  }

  // mobile menu
  const menuBtn = document.getElementById('menu-btn');
  const nav = document.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.textContent = open ? 'Close' : 'Menu';
    });
  }

  // login state (header mein naam / logout)
  (async function loadUser() {
    const slot = document.getElementById('auth-slot');
    if (!slot) return;
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('guest');
      const { user } = await res.json();
      EE.user = user;
      slot.innerHTML =
        `<span class="hello">Hi, ${EE.esc(user.name.split(' ')[0])}</span>` +
        (user.role === 'admin' ? '<a href="/admin.html">Dashboard</a>' : '') +
        '<button type="button" id="logout-btn">Log out</button>';
      document.getElementById('logout-btn').addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        location.reload();
      });
    } catch (e) {
      slot.innerHTML = '<a href="/login.html">Log in</a>';
    }
  })();

  // ---------- carousels (best sellers / new arrivals) ----------
  // Arrows: ek "page" jitne cards aage/peeche
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-scroll]');
    if (!b) return;
    const el = document.querySelector(b.dataset.scroll);
    const card = el && el.firstElementChild;
    if (!card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 16;
    const pitch = card.getBoundingClientRect().width + gap;
    const perPage = Math.max(1, Math.floor(el.clientWidth / pitch));
    el.scrollBy({ left: Number(b.dataset.dir) * pitch * perPage, behavior: 'smooth' });
  });

  // Mouse drag + arrows ko start/end pe disable karna
  EE.initScrollers = function () {
    document.querySelectorAll('.scroller').forEach((el) => {
      if (el._ready) return;
      el._ready = true;
      const prev = document.querySelector(`[data-scroll="#${el.id}"][data-dir="-1"]`);
      const next = document.querySelector(`[data-scroll="#${el.id}"][data-dir="1"]`);
      const update = () => {
        if (prev) prev.disabled = el.scrollLeft <= 2;
        if (next) next.disabled = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
      };
      el._update = update;
      el.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();

      // Side-swipe ko Lenis tak mat jaane do (carousel khud sambhale),
      // par upar-neeche scroll Lenis ko hi jaaye taaki smooth scroll na tute.
      el.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.stopPropagation();
      }, { passive: true });

      let down = false, startX = 0, startLeft = 0, moved = 0;
      el.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return; // touch/trackpad native chalte hain
        down = true; moved = 0; startX = e.clientX; startLeft = el.scrollLeft;
      });
      window.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - startX;
        moved = Math.max(moved, Math.abs(dx));
        if (moved > 5) el.classList.add('dragging');
        if (el.classList.contains('dragging')) el.scrollLeft = startLeft - dx;
      });
      window.addEventListener('pointerup', () => { down = false; el.classList.remove('dragging'); });
      el.addEventListener('dragstart', (e) => e.preventDefault()); // image/link ka ghost-drag band
      el.addEventListener('click', (e) => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); } }, true);
    });
  };
  EE.refreshScrollers = () => document.querySelectorAll('.scroller').forEach((el) => el._update && el._update());
  EE.initScrollers();

  // ---------- smooth scroll + motion ----------
  EE.motion = false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    EE.motion = true;

    if (typeof Lenis !== 'undefined') {
      const lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      EE.lenis = lenis;
    }
    window.addEventListener('load', () => ScrollTrigger.refresh());
  } else {
    document.documentElement.classList.remove('motion');
  }
})();
