// ---------------------------------------------------------------
// common.js  ->  har page pe chalta hai (defer). Header/footer ab server se aate hain,
// yahan sirf unko "zinda" karna hai + helpers.
// Koi bhi bahari library nahi (GSAP hata di). Smooth scroll (Lenis) sirf desktop pe, load ke baad.
// ---------------------------------------------------------------
(function () {
  const EE = (window.EE = {});
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  EE.motion = !reduce;

  // ---------- helpers ----------
  EE.fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');
  EE.esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Image load na ho (file abhi daali nahi) toh rang-birangi placeholder dikhao
  window.imgFail = function (el) {
    if (!el.dataset.soft && el.parentElement) el.parentElement.classList.add('is-empty');
    el.remove();
  };
  document.querySelectorAll('img:not([loading="lazy"])').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.parentElement && img.getAttribute('src')) window.imgFail(img);
  });

  // ---------- responsive images ( /images/x.jpg?v=1  ->  /img/x.jpg?w=480&v=1 ) ----------
  EE.imgUrl = (src, w) => {
    const m = /^\/images\/([^?]+)(?:\?v=(\d+))?/.exec(src || '');
    return m ? `/img/${m[1]}?w=${w}${m[2] ? '&v=' + m[2] : ''}&f=2` : src; // f=2: cache-buster
  };
  EE.imgSet = (src, widths) =>
    /^\/images\//.test(src || '') ? widths.map((w) => `${EE.imgUrl(src, w)} ${w}w`).join(', ') : '';
  const CARD_SIZES = '(max-width: 760px) 46vw, (max-width: 1100px) 31vw, 300px';
  // Hover wali doosri photo crop na ho isliye thoda badi version mangwao
  const ALT_SIZES = '(max-width: 760px) 92vw, (max-width: 1100px) 62vw, 600px';

  EE.img = (src, alt, o = {}) => {
    if (!src) return '';
    const widths = o.widths || [320, 480, 640, 800];
    const set = EE.imgSet(src, widths);
    const first = widths[Math.min(2, widths.length - 1)];
    return `<img src="${EE.esc(EE.imgUrl(src, first))}"${set ? ` srcset="${EE.esc(set)}" sizes="${o.sizes || CARD_SIZES}"` : ''} alt="${EE.esc(alt)}" loading="${o.eager ? 'eager' : 'lazy'}" decoding="async"${o.eager ? ' fetchpriority="high"' : ''} onload="imgTrim(this)" onerror="imgFail(this)">`;
  };

  // "-2" wali photos (frame-only, white background) ko apne aap crop karo:
  // aas-paas ki safed jagah hata ke frame ko card mein bada aur poora dikhao.
  // Background safed nahi hai (model photo) toh jaisi hai waisi rahegi.
  window.contentBox = function (d, w, h, limit) {
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i] < limit || d[i + 1] < limit || d[i + 2] < limit) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return maxX < 0 ? null : { x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1 };
  };

  function trimFrom(el, img) {
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return;
    const scale = Math.min(1, 400 / Math.max(w, h)); // detection ke liye chhota copy (fast)
    const sw = Math.max(1, Math.round(w * scale)), sh = Math.max(1, Math.round(h * scale));
    const small = document.createElement('canvas');
    small.width = sw; small.height = sh;
    const sctx = small.getContext('2d', { willReadFrequently: true });
    sctx.fillStyle = '#fff';
    sctx.fillRect(0, 0, sw, sh);
    sctx.drawImage(img, 0, 0, sw, sh);
    const box = window.contentBox(sctx.getImageData(0, 0, sw, sh).data, sw, sh, 240);
    if (!box) return;
    const bw = box.x1 - box.x0, bh = box.y1 - box.y0;
    if (bw > sw * 0.92 && bh > sh * 0.92) return; // pehle se tight / safed background nahi
    const m = Math.round(Math.max(bw, bh) * 0.03);  // 3% margin
    const x0 = Math.max(0, box.x0 - m), y0 = Math.max(0, box.y0 - m);
    const x1 = Math.min(sw, box.x1 + m), y1 = Math.min(sh, box.y1 + m);
    const k = 1 / scale;
    const out = document.createElement('canvas');
    out.width = Math.round((x1 - x0) * k);
    out.height = Math.round((y1 - y0) * k);
    out.getContext('2d').drawImage(img, x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, 0, 0, out.width, out.height);
    el.classList.add('trimmed');
    el.removeAttribute('srcset');
    el.removeAttribute('sizes');
    el.src = out.toDataURL('image/jpeg', 0.9);
  }

  window.imgTrim = function (el) {
    if (el.dataset.trimmed) return;
    const url = el.currentSrc || el.getAttribute('src') || '';
    if (!/-2\.(jpe?g|png|webp|avif)(\?.*)?$/i.test(url)) return;
    el.dataset.trimmed = '1';
    // srcset wali <img> ka naturalWidth "sizes" ke hisaab se badal jata hai, isliye alag Image() se asli pixels padho
    // (same URL hai, browser cache se aati hai, dobara download nahi hoti)
    const probe = new Image();
    probe.onload = () => { try { trimFrom(el, probe); } catch (e) { /* photo jaisi hai waisi dikhegi */ } };
    probe.src = url;
  };
  document.querySelectorAll('img').forEach((i) => { if (i.complete && i.naturalWidth) window.imgTrim(i); });

  EE.PALETTE = ['#F4C7B8', '#BFE3DF', '#D8CCEE', '#F5E0A8', '#EFBDBB', '#C9DDF2'];
  const SWATCHES = {
    'gold': '#C9A24B', 'black': '#15110F', 'tortoise': '#8A5A2B', 'amber': '#D98A2B', 'gunmetal': '#5B6068',
    'matte black': '#25221F', 'silver': '#C0C4CA', 'clear rose': '#F0C9CC', 'havana': '#7A4A24',
    'rose gold': '#D9A08B', 'clear': '#E9EEF0', 'navy': '#1F2D5A', 'blush': '#F1C6C0', 'graphite': '#4A4D52', 'champagne': '#D8C4A0'
  };
  EE.swatch = (name) => SWATCHES[String(name || '').toLowerCase()] || '#BBBBBB';

  EE.wishSet = new Set();
  EE.stars = (avg) => { const n = Math.round(avg); return '★'.repeat(n) + '☆'.repeat(5 - n); };

  // Hover wali doosri photo tabhi download hoti hai jab mouse card pe aaye (data bachta hai)
  EE.productCard = (p) => `
    <div class="card-wrap">
      <a class="card" href="/product.html?slug=${encodeURIComponent(p.slug)}" aria-label="${EE.esc(p.name)}, ${EE.fmt(p.price)}">
        <div class="card-media ph${p.image1 ? '' : ' is-empty'}" style="--ph:${EE.PALETTE[p.id % EE.PALETTE.length]}">
          ${EE.img(p.image1, p.name + ' frame')}
          ${p.image2 ? `<img class="alt" data-src="${EE.esc(EE.imgUrl(p.image2, 640))}" data-srcset="${EE.esc(EE.imgSet(p.image2, [480, 640, 800, 1200]))}" sizes="${ALT_SIZES}" alt="" decoding="async" data-soft="1" onload="imgTrim(this)" onerror="imgFail(this)">` : ''}
        </div>
        <div class="card-info">
          <h3 class="card-name">${EE.esc(p.name)}</h3>
          <span class="card-price">${EE.fmt(p.price)}</span>
        </div>
        <p class="card-meta"><i class="swatch" style="--sw:${EE.swatch(p.color)}"></i><span>${EE.esc(p.category)}, ${EE.esc(p.shape || '')}</span>${p.reviewCount ? `<span class="card-rating" aria-label="Rated ${p.rating} out of 5">★ ${Number(p.rating).toFixed(1)} (${p.reviewCount})</span>` : ''}</p>
      </a>
      <button type="button" class="heart" data-wish="${p.id}" aria-pressed="${EE.wishSet.has(p.id)}" aria-label="Save ${EE.esc(p.name)} to wishlist">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>
      </button>
    </div>`;

  function loadAlt(e) {
    const wrap = e.target.closest && e.target.closest('.card-wrap');
    if (!wrap || e.pointerType === 'touch') return;
    const alt = wrap.querySelector('img.alt[data-src]');
    if (!alt) return;
    if (alt.dataset.srcset) alt.srcset = alt.dataset.srcset;
    alt.src = alt.dataset.src;
    alt.removeAttribute('data-src');
  }
  document.addEventListener('pointerover', loadAlt, { passive: true });
  document.addEventListener('focusin', loadAlt);

  // Card pe mouse: doosri photo dheere se fade hoke aati hai (simple hover,
  // koi 3D tilt nahi). Photo tabhi download hoti hai jab mouse card pe aaye.

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

  EE.fmtDate = (str) =>
    new Date(String(str).replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  EE.orderNo = (id) => 'EE-' + String(id).padStart(4, '0');

  // ---------- cart ----------
  EE.setCartCount = (n) => {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = n > 0 ? String(n) : '';
  };
  EE.refreshCart = async () => {
    try {
      const res = await fetch('/api/cart');
      if (!res.ok) return null;
      const data = await res.json();
      EE.setCartCount(data.count);
      return data;
    } catch (e) { return null; }
  };

  // Cart mein add. Login nahi hai toh login page pe bhejo, aur login ke baad wapas yahin laao.
  EE.addToCart = async function (productId, quantity = 1) {
    try {
      const res = await fetch('/api/cart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity })
      });
      if (res.status === 401) {
        location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search);
        return false;
      }
      const data = await res.json();
      if (!res.ok) { EE.toast(data.error || 'Could not add to cart.'); return false; }
      EE.setCartCount(data.count);
      EE.toast(data.capped ? 'Added the maximum available for this frame.' : 'Added to cart.');
      return true;
    } catch (e) {
      EE.toast('Could not reach the server.');
      return false;
    }
  };

  // ---------- wishlist ----------
  EE.paintWish = () => {
    document.querySelectorAll('[data-wish]').forEach((el) => {
      const on = EE.wishSet.has(Number(el.dataset.wish));
      el.setAttribute('aria-pressed', String(on));
      if (el.dataset.on) el.textContent = on ? el.dataset.on : el.dataset.off;
    });
    const c = document.getElementById('wish-count');
    if (c) c.textContent = EE.wishSet.size ? String(EE.wishSet.size) : '';
  };
  EE.setWish = (id, on) => { if (on) EE.wishSet.add(id); else EE.wishSet.delete(id); EE.paintWish(); };
  EE.refreshWishlist = async () => {
    try {
      const res = await fetch('/api/wishlist');
      if (!res.ok) return;
      EE.wishSet = new Set((await res.json()).ids);
      EE.paintWish();
    } catch (e) { /* wishlist optional hai */ }
  };

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-wish]');
    if (!b) return;
    e.preventDefault();
    const id = Number(b.dataset.wish);
    if (!(await EE.userReady)) {
      location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search);
      return;
    }
    const on = !EE.wishSet.has(id);
    EE.setWish(id, on); // turant dikhao, server baad mein
    const res = await fetch(on ? '/api/wishlist' : '/api/wishlist/' + id, {
      method: on ? 'POST' : 'DELETE',
      headers: on ? { 'Content-Type': 'application/json' } : {},
      body: on ? JSON.stringify({ productId: id }) : undefined
    }).catch(() => null);
    if (!res || !res.ok) { EE.setWish(id, !on); EE.toast('Could not update your wishlist.'); return; }
    EE.toast(on ? 'Saved to your wishlist.' : 'Removed from your wishlist.');
    document.dispatchEvent(new CustomEvent('ee:wish', { detail: { id, on } }));
  });

  // ---------- header / footer ko zinda karo (HTML server se aata hai) ----------
  const menuBtn = document.getElementById('menu-btn');
  const nav = document.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.textContent = open ? 'Close' : 'Menu';
    });
  }

  const newsForm = document.getElementById('news-form');
  if (newsForm) {
    newsForm.addEventListener('submit', (e) => {
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

  // login state (header mein naam / logout) + cart count + wishlist
  EE.userReady = (async function loadUser() {
    const slot = document.getElementById('auth-slot');
    try {
      const res = await fetch('/api/auth/session');
      const { user } = await res.json();
      if (!user) return null; // guest: server ne already "Log in" link daal rakha hai
      EE.user = user;
      if (slot) {
        slot.innerHTML =
          `<a class="login-link" href="/orders.html" aria-label="Your orders"><span class="avatar" aria-hidden="true">${EE.esc(user.name.trim()[0].toUpperCase())}</span><span>${EE.esc(user.name.split(' ')[0])}</span></a>` +
          (user.role === 'admin' ? '<a href="/admin.html">Dashboard</a>' : '') +
          '<button type="button" id="logout-btn">Log out</button>';
        document.getElementById('logout-btn').addEventListener('click', async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          location.href = '/';
        });
      }
      EE.refreshCart();
      EE.refreshWishlist();
      return user;
    } catch (e) {
      return null; // server ne already "Log in" link daal rakha hai
    }
  })();

  // Protected pages: login nahi hai toh login page pe bhejo (next ke saath)
  EE.requireUser = async () => {
    const user = await EE.userReady;
    if (!user) {
      location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search);
      return null;
    }
    return user;
  };

  // ---------- carousels (best sellers / new arrivals) ----------
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

      // Side-swipe ko smooth-scroll tak mat jaane do, par upar-neeche scroll page ko hi jaaye
      el.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.stopPropagation();
      }, { passive: true });

      let down = false, startX = 0, startLeft = 0, moved = 0;
      el.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
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
      el.addEventListener('dragstart', (e) => e.preventDefault());
      el.addEventListener('click', (e) => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); } }, true);
    });
  };
  EE.refreshScrollers = () => document.querySelectorAll('.scroller').forEach((el) => el._update && el._update());
  EE.initScrollers();

  // ---------- smooth scroll: sirf desktop pe, page load hone ke BAAD (Lighthouse pe asar nahi) ----------
  const wantSmooth = !reduce && !document.body.hasAttribute('data-no-smooth') &&
    window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)').matches;

  if (wantSmooth) {
    const start = () => {
      const s = document.createElement('script');
      // apni file download ho gayi ho toh wahi, warna CDN se (load ke baad, isliye Lighthouse pe asar nahi)
      s.src = document.querySelector('meta[name="ee-smooth"]') ? '/vendor/lenis.min.js' : 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js';
      s.onload = () => {
        if (!window.Lenis) return;
        const lenis = new window.Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        EE.lenis = lenis;
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      };
      document.head.appendChild(s);
    };
    const go = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 4000 }) : setTimeout(start, 2000));
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  }
})();
