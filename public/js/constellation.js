// ---------------------------------------------------------------
// constellation.js  ->  login page ka background
// Chhoti circular photos "stars" ki tarah bikhri hoti hain, dheere se drift
// karti hain, aur ek hi category wale frames ke beech lines (constellation)
// banti hain. Ye 21st.dev ke ConstellationGallery component ka vanilla JS
// port hai -- is project me React/Tailwind nahi hai, isliye seedha DOM + CSS.
// Photos website ki apni product images se aati hain (sirf "-1" wali).
// ---------------------------------------------------------------
(function () {
  const HOST = document.getElementById('auth-constellation');
  if (!HOST) return;

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = mq.matches;
  if (mq.addEventListener) mq.addEventListener('change', (e) => { reduce = e.matches; });

  const DRIFT = 9;                 // px, idle movement
  const AUTOPLAY_MS = 7000;        // har itne ms me agla constellation
  const IDLE_MS = 2400;            // itni der mouse na hile toh autoplay
  const LINE_MS = 420;
  const SEED = 11;

  const imgUrl = (src, w) => (window.EE && EE.imgUrl ? EE.imgUrl(src, w) : src);

  // ---------- deterministic randomness ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Rejection-sampled scatter (percent), har star doosre se kam se kam minDist door
  function scatter(count, seed, minDist) {
    const random = mulberry32(seed);
    const points = [];
    for (let i = 0; i < count; i++) {
      let best = null;
      let bestScore = -1;
      for (let attempt = 0; attempt < 90; attempt++) {
        const candidate = { x: 6 + random() * 88, y: 8 + random() * 84 };
        const nearest = points.reduce(
          (m, p) => Math.min(m, Math.hypot(candidate.x - p.x, (candidate.y - p.y) * 0.62)),
          Infinity
        );
        if (nearest >= minDist) { best = candidate; break; }
        if (nearest > bestScore) { bestScore = nearest; best = candidate; }
      }
      points.push(best || { x: 50, y: 50 });
    }
    return points;
  }

  // Prim ka minimum spanning tree: sabse kam lines jo saare members ko jodti hain
  function spanningTree(indices, at) {
    if (indices.length < 2) return [];
    const inTree = new Set([indices[0]]);
    const edges = [];
    while (inTree.size < indices.length) {
      let best = null;
      let bestDist = Infinity;
      for (const a of inTree) {
        for (const b of indices) {
          if (inTree.has(b)) continue;
          const pa = at(a);
          const pb = at(b);
          const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
          if (d < bestDist) { bestDist = d; best = [a, b]; }
        }
      }
      if (!best) break;
      inTree.add(best[1]);
      edges.push(best);
    }
    return edges;
  }

  // ---------- state ----------
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'cg-lines');
  svg.setAttribute('aria-hidden', 'true');
  HOST.appendChild(svg);

  let items = [];          // { src, tags }
  let stars = [];          // { wrap, dx, dy }
  let positions = [];      // percent
  let phases = [];
  const lines = new Map(); // "a-b" -> <line>
  let hovered = null;
  let autoTag = null;
  let members = null;      // Set of indexes
  let cursor = -1;
  let lastInput = -Infinity;
  let raf = 0;
  let start = 0;

  const size = () => (HOST.getBoundingClientRect().width < 720 ? 62 : 84);

  function activeSet() {
    if (hovered !== null && items[hovered]) return new Set(items[hovered].tags);
    if (autoTag) return new Set([autoTag]);
    return null;
  }

  function drawLines() {
    const edges = members ? spanningTree([...members], (i) => positions[i]) : [];
    const wanted = new Set(edges.map(([a, b]) => a + '-' + b));

    for (const [key, line] of lines) {
      if (!wanted.has(key)) { line.remove(); lines.delete(key); }
    }
    for (const [a, b] of edges) {
      const key = a + '-' + b;
      if (lines.has(key)) continue;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('data-edge', key);
      svg.appendChild(line);
      lines.set(key, line);
      if (!reduce && line.animate) {
        line.animate([{ opacity: 0 }, { opacity: 1 }], { duration: LINE_MS, easing: 'ease-out' });
      }
    }
    kick();
  }

  function paint() {
    const act = activeSet();
    members = act
      ? new Set(items.map((it, i) => (it.tags.some((t) => act.has(t)) ? i : -1)).filter((i) => i >= 0))
      : null;

    stars.forEach((s, i) => {
      s.wrap.classList.toggle('is-dim', !!members && !members.has(i));
      s.wrap.classList.toggle('is-lit', !!members && members.has(i));
      s.wrap.classList.toggle('is-hover', hovered === i);
    });
    drawLines();
  }

  // ---------- animation ----------
  function frame(now) {
    raf = 0;
    if (!start) start = now;
    const t = (now - start) / 1000;
    const still = reduce || DRIFT === 0;
    const host = HOST.getBoundingClientRect();

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const p = phases[i];
      const dx = still ? 0 : Math.sin(t * p.fx * Math.PI * 2 + p.px) * DRIFT;
      const dy = still ? 0 : Math.cos(t * p.fy * Math.PI * 2 + p.py) * DRIFT;
      s.dx = dx;
      s.dy = dy;
      s.wrap.style.translate = dx.toFixed(2) + 'px ' + dy.toFixed(2) + 'px';
    }

    for (const [key, line] of lines) {
      const [a, b] = key.split('-').map(Number);
      const pa = { x: (positions[a].x / 100) * host.width + stars[a].dx, y: (positions[a].y / 100) * host.height + stars[a].dy };
      const pb = { x: (positions[b].x / 100) * host.width + stars[b].dx, y: (positions[b].y / 100) * host.height + stars[b].dy };
      line.setAttribute('x1', pa.x.toFixed(1));
      line.setAttribute('y1', pa.y.toFixed(1));
      line.setAttribute('x2', pb.x.toFixed(1));
      line.setAttribute('y2', pb.y.toFixed(1));
    }

    if ((!still || lines.size) && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function setHovered(i) {
    if (hovered === i) return;
    hovered = i;
    if (i !== null) autoTag = null;
    paint();
  }

  // ---------- build ----------
  function applySize() {
    const s = size();
    stars.forEach((star) => {
      star.wrap.style.width = s + 'px';
      star.wrap.style.height = s + 'px';
      star.wrap.style.margin = (-s / 2) + 'px 0 0 ' + (-s / 2) + 'px';
    });
  }

  function build() {
    positions = scatter(items.length, SEED, size() < 70 ? 12 : 15);
    const rand = mulberry32(SEED + 1);
    phases = items.map(() => ({
      px: rand() * Math.PI * 2,
      py: rand() * Math.PI * 2,
      fx: 0.16 + rand() * 0.12,
      fy: 0.13 + rand() * 0.12
    }));

    stars = items.map((item, i) => {
      const p = positions[i];
      const wrap = document.createElement('div');
      wrap.className = 'cg-star';
      wrap.style.left = p.x + '%';
      wrap.style.top = p.y + '%';

      const img = document.createElement('img');
      img.src = item.src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      wrap.appendChild(img);

      wrap.addEventListener('pointerenter', () => { lastInput = performance.now(); setHovered(i); });
      wrap.addEventListener('pointerleave', () => { if (hovered === i) setHovered(null); });

      HOST.appendChild(wrap);
      return { wrap, dx: 0, dy: 0 };
    });

    applySize();
    if (!reduce) kick();
  }

  // ---------- autoplay: idle ho toh ek ke baad ek constellation ----------
  function autoplay() {
    if (!items.length) return;
    const idle = performance.now() - lastInput > IDLE_MS;
    if (!idle || hovered !== null) {
      if (autoTag !== null) { autoTag = null; paint(); }
      return;
    }
    const tags = [...new Set(items.flatMap((it) => it.tags))];
    if (!tags.length) return;
    cursor = (cursor + 1) % tags.length;
    autoTag = tags[cursor];
    paint();
  }

  // ---------- data: website ki apni "-1" product photos ----------
  async function load() {
    try {
      const res = await fetch('/api/products?limit=100');
      if (!res.ok) throw new Error('products');
      const { products } = await res.json();
      items = products.slice(0, 15).map((p) => ({
        src: imgUrl(p.image1, 320),
        tags: [p.category]
      }));
      if (items.length < 3) return; // itne kam na ho toh background photo hi rehne do
      build();
      document.addEventListener('pointermove', () => { lastInput = performance.now(); }, { passive: true });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) { start = 0; kick(); } });
      window.addEventListener('resize', applySize);
      setInterval(autoplay, AUTOPLAY_MS);
      setTimeout(autoplay, 700);
    } catch (e) {
      HOST.remove(); // API na chale toh kuch na dikhe, page phir bhi chale
    }
  }

  load();
})();
