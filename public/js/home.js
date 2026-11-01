// ---------------------------------------------------------------
// home.js  ->  Home page: hero video + sections ka data
// Hero mein SVG chashma nahi hai: ek video placeholder hai (poster photo ke saath).
// Asli video daalne par wahi khud muted autoplay hota hai, click se play/pause.
// ---------------------------------------------------------------
(function () {
  // ---------- 1. Hero video ----------
  const video = document.getElementById('hero-media');
  if (video) {
    video.muted = true; // autoplay ke liye zaroori
    const start = video.play();
    if (start && start.catch) start.catch(() => {}); // browser ne roka toh poster hi dikhega
    video.addEventListener('click', () => {
      if (video.paused) video.play().catch(() => {}); else video.pause();
    });
  }

  // ---------- 2. Bade wordmark ka halka sa upar uthna ----------
  const group = document.querySelector('.group');
  if (group && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { group.classList.add('in'); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(group);
  } else if (group) {
    group.classList.add('in');
  }

  // ---------- 3. Data ----------
  const $ = (id) => document.getElementById(id);

  function tile(href, title, sub, p, color) {
    return `
      <a class="tile ph${p && p.image1 ? '' : ' is-empty'}" href="${href}" style="--ph:${color}">
        ${p ? EE.img(p.image1, title, { widths: [480, 800, 1200], sizes: '(max-width: 760px) 100vw, 40vw' }) : ''}
        <div class="tile-cap"><strong>${EE.esc(title)}</strong><span>${EE.esc(sub)}</span></div>
      </a>`;
  }

  async function load() {
    try {
      const res = await fetch('/api/products?limit=100');
      if (!res.ok) throw new Error('products');
      const { products } = await res.json(); // featured pehle
      const byCat = (c) => products.filter((p) => p.category === c);
      const newest = [...products].sort((a, b) => b.id - a.id);

      $('best-scroller').innerHTML = products.slice(0, 8).map(EE.productCard).join('');
      $('new-scroller').innerHTML = newest.slice(0, 8).map(EE.productCard).join('');
      EE.paintWish();

      const sun = byCat('Sunglasses'), eye = byCat('Eyeglasses'), scr = byCat('Screen Glasses');

      // Har tile ke liye alag product (ek hi photo do tiles mein repeat na ho)
      const used = new Set();
      const pick = (list) => {
        const p = list.find((x) => !used.has(x.id)) || list[0];
        if (p) used.add(p.id);
        return p;
      };
      const tNew = pick(newest);
      const tSun = pick(sun), tEye = pick(eye), tScr = pick(scr);
      const tBest = pick(products);

      $('bento').innerHTML =
        tile('/shop.html?category=Sunglasses', 'Sunglasses', `${sun.length} frames for bright days`, tSun, EE.PALETTE[0]) +
        tile('/shop.html?category=Eyeglasses', 'Optical', `${eye.length} everyday frames`, tEye, EE.PALETTE[1]) +
        tile('/shop.html?category=Screen%20Glasses', 'Blue light', `${scr.length} frames for long screen days`, tScr, EE.PALETTE[2]) +
        tile('/shop.html', 'Best sellers', 'Most loved by you', tBest, EE.PALETTE[3]) +
        tile('/shop.html?sort=newest', 'New arrivals', 'Just landed', tNew, EE.PALETTE[4]);

      // Mosaic: product photos ka grid (overlay text pehle se HTML mein hai)
      const over = document.querySelector('.mosaic-over');
      const picks = [...products].reverse().slice(0, 10);
      over.insertAdjacentHTML('beforebegin', picks.map((p, i) => `
        <a class="t ph${p.image1 ? '' : ' is-empty'}" href="/product.html?slug=${encodeURIComponent(p.slug)}"
           style="--ph:${EE.PALETTE[i % EE.PALETTE.length]}" aria-label="${EE.esc(p.name)}">
          ${EE.img(p.image1, '', { widths: [240, 320, 480], sizes: '(max-width: 760px) 34vw, 20vw' })}
        </a>`).join(''));

      EE.refreshScrollers();
    } catch (err) {
      $('best-scroller').innerHTML = '<p class="empty-note">We could not load the frames. Check that the server is running and refresh the page.</p>';
      $('new-scroller').innerHTML = '';
    }
  }

  load();
})();
